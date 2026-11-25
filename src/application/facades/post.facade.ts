import type {
  PostInput,
  PostManaged,
  PostQuery,
  PostRepository,
  PostUpdateInput,
} from '~application/repositories/post.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { TransformService } from '~application/services/transform.service';
import { type PostEntity, PostStatus, Role, UserStatus } from '~domain/entities';
import {
  EntityNotFoundException,
  ForbiddenException,
  PostNotPublishableException,
  UnauthorizedException,
} from '~domain/exceptions';
import type { PostId, UserId } from '~domain/types/branded';

// Bài mới luôn là bản nháp; trạng thái được facade đặt, không nhận từ client.
export type CreatePostParams = Omit<PostInput, 'slug' | 'status' | 'publishedAt'>;

// `authorId` là id của người đang thực hiện thao tác. Role được facade đọc từ DB, không nhận từ token.
export type UpdatePostParams = PostUpdateInput & {
  id: PostId;
  authorId: UserId;
};

export type DeletePostParams = {
  id: PostId;
  authorId: UserId;
};

export type GetManagedPostParams = {
  id: PostId;
  authorId: UserId;
};

export type ChangePostStatusParams = {
  id: PostId;
  authorId: UserId;
  status: PostStatus;
};

export type ListPostInput = {
  page?: number;
  limit?: number;
  author?: UserId;
};

export type ListMyPostsParams = Omit<PostQuery, 'author'> & { authorId: UserId };

function canManagePost(post: PostEntity, requesterId: UserId, requesterRole: Role): boolean {
  return post.authorId === requesterId || requesterRole === Role.ADMIN;
}

export class PostFacade {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly transformService: TransformService,
    private readonly userRepository: UserRepository,
  ) {}

  // --- Queries công khai: chỉ trả bài đã xuất bản ---

  async listPosts(input: ListPostInput) {
    const { page = 1, limit = 10, author } = input;
    const posts = await this.postRepository.findAll({ page, limit, author, status: PostStatus.PUBLISHED });
    return { data: posts };
  }

  async queryPosts(query: PostQuery) {
    // Ghi đè status SAU khi spread để client không thể xem bản nháp qua query.
    const publicQuery: PostQuery = { ...query, status: PostStatus.PUBLISHED };
    const [posts, total] = await Promise.all([
      this.postRepository.findAll(publicQuery),
      this.postRepository.count(publicQuery),
    ]);
    return { data: posts, total };
  }

  async getPost(id: PostId): Promise<PostEntity> {
    const post = await this.postRepository.findById(id);
    if (!post || post.status !== PostStatus.PUBLISHED) {
      throw new EntityNotFoundException('Post', id);
    }
    return post;
  }

  async getPostDetail(slug: string) {
    const post = await this.postRepository.findBy('slug', slug);
    if (!post || post.status !== PostStatus.PUBLISHED) {
      throw new EntityNotFoundException('Post');
    }
    return post;
  }

  // --- Queries cho tác giả / admin: thấy cả bản nháp ---

  async listMyPosts({ authorId, ...query }: ListMyPostsParams) {
    const filter: PostQuery = { ...query, author: authorId };
    const [posts, total] = await Promise.all([this.postRepository.findAll(filter), this.postRepository.count(filter)]);
    return { data: posts, total };
  }

  async listAllPosts(query: PostQuery) {
    const [posts, total] = await Promise.all([this.postRepository.findAll(query), this.postRepository.count(query)]);
    return { data: posts, total };
  }

  async getManagedPost({ id, authorId }: GetManagedPostParams): Promise<PostManaged> {
    const requesterRole = await this.requireActiveRequester(authorId);

    const post = await this.postRepository.findDetailById(id);
    if (!post) {
      throw new EntityNotFoundException('Post', id);
    }

    if (!canManagePost(post, authorId, requesterRole)) {
      throw new ForbiddenException('You are not allowed to view this post');
    }

    return post;
  }

  // --- Commands ---

  async createPost(params: CreatePostParams): Promise<PostEntity> {
    await this.requireActiveRequester(params.authorId);

    const slug = this.transformService.slugify(params.title);
    return this.postRepository.create({ ...params, slug, status: PostStatus.DRAFT, publishedAt: null });
  }

  async updatePost(params: UpdatePostParams): Promise<PostEntity> {
    const { id, authorId, ...updateData } = params;
    const requesterRole = await this.requireActiveRequester(authorId);

    const existingPost = await this.postRepository.findById(id);
    if (!existingPost) {
      throw new EntityNotFoundException('Post', id);
    }

    if (!canManagePost(existingPost, authorId, requesterRole)) {
      throw new ForbiddenException('You are not allowed to update this post');
    }

    const updatePayload: PostUpdateInput = { ...updateData };
    if (updateData.title && existingPost.status === PostStatus.DRAFT) {
      updatePayload.slug = this.transformService.slugify(updateData.title);
    }

    return this.postRepository.update(id, updatePayload);
  }

  async changePostStatus({ id, authorId, status }: ChangePostStatusParams): Promise<PostEntity> {
    const requesterRole = await this.requireActiveRequester(authorId);

    const existingPost = await this.postRepository.findById(id);
    if (!existingPost) {
      throw new EntityNotFoundException('Post', id);
    }

    if (!canManagePost(existingPost, authorId, requesterRole)) {
      throw new ForbiddenException('You are not allowed to change the status of this post');
    }

    // Idempotent: đã ở trạng thái đó thì không làm gì.
    if (existingPost.status === status) {
      return existingPost;
    }

    if (status === PostStatus.PUBLISHED && !existingPost.thumbnailId) {
      throw new PostNotPublishableException('A post needs a thumbnail before it can be published');
    }

    // publishedAt là thời điểm xuất bản lần đầu, được giữ nguyên khi gỡ xuống rồi xuất bản lại.
    const publishedAt =
      status === PostStatus.PUBLISHED ? (existingPost.publishedAt ?? new Date()) : existingPost.publishedAt;

    return this.postRepository.updateStatus(id, { status, publishedAt });
  }

  async deletePost({ id, authorId }: DeletePostParams): Promise<void> {
    const requesterRole = await this.requireActiveRequester(authorId);

    const existingPost = await this.postRepository.findById(id);
    if (!existingPost) {
      throw new EntityNotFoundException('Post', id);
    }

    if (!canManagePost(existingPost, authorId, requesterRole)) {
      throw new ForbiddenException('You are not allowed to delete this post');
    }

    await this.postRepository.delete(id);
  }

  // Đọc role từ DB (không tin JWT): user bị khóa hoặc bị hạ quyền mất hiệu lực ngay.
  private async requireActiveRequester(userId: UserId): Promise<Role> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('Account is banned');
    }
    return user.role;
  }
}

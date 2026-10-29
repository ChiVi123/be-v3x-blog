import type { PostInput, PostQuery, PostRepository, PostUpdateInput } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import type { PostEntity } from '~domain/entities/post.entity';
import { EntityNotFoundException, ForbiddenException } from '~domain/exceptions';
import type { PostId, UserId } from '~domain/types/branded';

export type CreatePostParams = Omit<PostInput, 'slug'>;

export type UpdatePostParams = PostUpdateInput & {
  id: PostId;
  authorId: UserId;
};

export type DeletePostParams = {
  id: PostId;
  authorId: UserId;
};

export type ListPostInput = {
  page?: number;
  limit?: number;
  author?: UserId;
};

export class PostFacade {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly transformService: TransformService,
  ) {}

  // --- Queries ---

  async listPosts(input: ListPostInput) {
    const { page = 1, limit = 10, author } = input;
    const posts = await this.postRepository.findAll({ page, limit, author });
    return { data: posts };
  }

  async queryPosts(query: PostQuery) {
    const [posts, total] = await Promise.all([this.postRepository.findAll(query), this.postRepository.count(query)]);
    return { data: posts, total };
  }

  async getPost(id: PostId): Promise<PostEntity> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new EntityNotFoundException('Post', id);
    }
    return post;
  }

  getPostDetail(slug: string) {
    return this.postRepository.findBy('slug', slug);
  }

  // --- Commands ---

  async createPost(params: CreatePostParams): Promise<PostEntity> {
    const slug = this.transformService.slugify(params.title);
    return this.postRepository.create({ ...params, slug });
  }

  async updatePost(params: UpdatePostParams): Promise<PostEntity> {
    const { id, authorId, ...updateData } = params;

    const existingPost = await this.postRepository.findById(id);
    if (!existingPost) {
      throw new EntityNotFoundException('Post', id);
    }

    if (existingPost.authorId !== authorId) {
      throw new ForbiddenException('You are not allowed to update this post');
    }

    const updatePayload: PostUpdateInput = { ...updateData };
    if (updateData.title) {
      updatePayload.slug = this.transformService.slugify(updateData.title);
    }

    return this.postRepository.update(id, updatePayload);
  }

  async deletePost({ id, authorId }: DeletePostParams): Promise<void> {
    const existingPost = await this.postRepository.findById(id);
    if (!existingPost) {
      throw new EntityNotFoundException('Post', id);
    }

    if (existingPost.authorId !== authorId) {
      throw new ForbiddenException('You are not allowed to delete this post');
    }

    await this.postRepository.delete(id);
  }
}

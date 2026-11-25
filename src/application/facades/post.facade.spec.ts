import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PostDetail, PostRepository, PostRow } from '~application/repositories/post.repository';
import type { UserOutput, UserRepository } from '~application/repositories/user.repository';
import type { TransformService } from '~application/services/transform.service';
import { type PostEntity, PostStatus, Role, UserStatus } from '~domain/entities';
import {
  EntityNotFoundException,
  ForbiddenException,
  PostNotPublishableException,
  UnauthorizedException,
} from '~domain/exceptions';
import type { CategoryId, ImageId, PostId, UserId } from '~domain/types/branded';
import { PostFacade } from './post.facade';

describe('PostFacade', () => {
  let facade: PostFacade;
  let mockPostRepository: {
    create: ReturnType<typeof mock>;
    findById: ReturnType<typeof mock>;
    findDetailById: ReturnType<typeof mock>;
    findBy: ReturnType<typeof mock>;
    findAll: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    updateStatus: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    count: ReturnType<typeof mock>;
  };
  let mockUserRepository: { findById: ReturnType<typeof mock> };
  let mockTransformService: { slugify: ReturnType<typeof mock> };

  const publishedAt = new Date('2026-01-02T00:00:00Z');

  const mockPost: PostEntity = {
    id: 'post-1' as PostId,
    title: 'Original Title',
    slug: 'original-title',
    content: 'Original content with plenty of detail.',
    readingTime: 5,
    status: PostStatus.PUBLISHED,
    publishedAt,
    categoryId: 'Tech' as CategoryId,
    authorId: 'user-1' as UserId,
    thumbnailId: null as ImageId | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const draftPost: PostEntity = {
    ...mockPost,
    status: PostStatus.DRAFT,
    publishedAt: null,
    thumbnailId: 'image-1' as ImageId,
  };

  const mockPostRow: PostRow = {
    id: 'post-1' as PostId,
    title: 'Original Title',
    slug: 'original-title',
    readingTime: 5,
    status: PostStatus.PUBLISHED,
    publishedAt,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    author: null,
    category: null,
    thumbnail: null,
  };

  const mockPostDetail: PostDetail = {
    id: 'post-1' as PostId,
    title: 'Original Title',
    slug: 'original-title',
    content: 'Original content with plenty of detail.',
    readingTime: 5,
    status: PostStatus.PUBLISHED,
    publishedAt,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    author: null,
    category: null,
    thumbnail: null,
  };

  const makeUser = (overrides: Partial<UserOutput> = {}): UserOutput => ({
    id: 'user-1' as UserId,
    username: 'john_doe',
    email: 'john@example.com',
    role: Role.USER,
    status: UserStatus.ACTIVE,
    bio: null,
    avatarId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  // Cấu hình người đang thao tác mà DB trả về, bất kể id được hỏi là gì.
  const setRequester = (user: UserOutput | null) => {
    mockUserRepository.findById = mock(async () => user);
  };

  const adminUser = () => makeUser({ id: 'admin-user' as UserId, role: Role.ADMIN });

  beforeEach(() => {
    mockPostRepository = {
      create: mock(async (input: unknown) => ({
        ...mockPost,
        ...(input as object),
      })),
      findById: mock(async () => mockPost),
      findBy: mock(async () => mockPostDetail),
      findDetailById: mock(async () => ({ ...mockPost, author: null, thumbnail: null })),
      findAll: mock(async () => [mockPostRow]),
      update: mock(async (_id: PostId, input: unknown) => ({
        ...mockPost,
        ...(input as object),
      })),
      updateStatus: mock(async (_id: PostId, input: unknown) => ({
        ...mockPost,
        ...(input as object),
      })),
      delete: mock(async () => undefined),
      count: mock(async () => 1),
    };

    // Mặc định: người thao tác là user thường, đang hoạt động.
    mockUserRepository = { findById: mock(async (id: UserId) => makeUser({ id })) };

    mockTransformService = {
      slugify: mock((text: string) => text.toLowerCase().replace(/\s+/g, '-')),
    };

    facade = new PostFacade(
      mockPostRepository as unknown as PostRepository,
      mockTransformService as unknown as TransformService,
      mockUserRepository as unknown as UserRepository,
    );
  });

  describe('createPost', () => {
    it('should create the post as a draft and slugify the title', async () => {
      const result = await facade.createPost({
        title: 'New Post',
        content: 'Valid content text here...',
        authorId: 'user-1' as UserId,
        categoryId: 'Tech' as CategoryId,
        thumbnailId: null,
      });

      expect(mockTransformService.slugify).toHaveBeenCalledWith('New Post');
      expect(mockPostRepository.create).toHaveBeenCalledWith({
        title: 'New Post',
        slug: 'new-post',
        content: 'Valid content text here...',
        authorId: 'user-1' as UserId,
        categoryId: 'Tech' as CategoryId,
        thumbnailId: null,
        status: PostStatus.DRAFT,
        publishedAt: null,
      });
      expect(result.slug).toBe('new-post');
      expect(result.status).toBe(PostStatus.DRAFT);
    });
  });

  describe('listPosts', () => {
    it('should return only published posts and apply default page and limit', async () => {
      const result = await facade.listPosts({});

      expect(mockPostRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        author: undefined,
        status: PostStatus.PUBLISHED,
      });
      expect(result).toEqual({ data: [mockPostRow] });
    });

    it('should pass custom pagination and author filter to repository', async () => {
      const authorId = 'author-123' as UserId;
      const result = await facade.listPosts({ page: 2, limit: 20, author: authorId });

      expect(mockPostRepository.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        author: authorId,
        status: PostStatus.PUBLISHED,
      });
      expect(result).toEqual({ data: [mockPostRow] });
    });
  });

  describe('queryPosts', () => {
    it('should query published posts and return total count', async () => {
      const result = await facade.queryPosts({ page: 1, limit: 10 });

      expect(mockPostRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10, status: PostStatus.PUBLISHED });
      expect(mockPostRepository.count).toHaveBeenCalledWith({ page: 1, limit: 10, status: PostStatus.PUBLISHED });
      expect(result).toEqual({ data: [mockPostRow], total: 1 });
    });

    it('should override a status supplied by the caller so drafts are never exposed', async () => {
      await facade.queryPosts({ page: 1, limit: 10, status: PostStatus.DRAFT });

      expect(mockPostRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10, status: PostStatus.PUBLISHED });
      expect(mockPostRepository.count).toHaveBeenCalledWith({ page: 1, limit: 10, status: PostStatus.PUBLISHED });
    });
  });

  describe('listMyPosts', () => {
    it('should filter by the requester and not force a status', async () => {
      const result = await facade.listMyPosts({
        authorId: 'user-1' as UserId,
        page: 1,
        limit: 10,
        status: PostStatus.DRAFT,
      });

      expect(mockPostRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: PostStatus.DRAFT,
        author: 'user-1' as UserId,
      });
      expect(mockPostRepository.count).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: PostStatus.DRAFT,
        author: 'user-1' as UserId,
      });
      expect(result).toEqual({ data: [mockPostRow], total: 1 });
    });
  });

  describe('listAllPosts', () => {
    it('should pass the query through untouched so drafts are included, and return the total', async () => {
      const query = { page: 1, limit: 10, status: PostStatus.DRAFT, author: 'user-1' as UserId };
      const result = await facade.listAllPosts(query);

      expect(mockPostRepository.findAll).toHaveBeenCalledWith(query);
      expect(mockPostRepository.count).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [mockPostRow], total: 1 });
    });

    it('should not force a status when none is given', async () => {
      await facade.listAllPosts({ page: 1, limit: 10 });

      expect(mockPostRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  describe('getPost', () => {
    it('should return a published post when found', async () => {
      const result = await facade.getPost('post-1' as PostId);

      expect(mockPostRepository.findById).toHaveBeenCalledWith('post-1' as PostId);
      expect(result).toEqual(mockPost);
    });

    it('should throw EntityNotFoundException when post not found', async () => {
      mockPostRepository.findById = mock(async () => null);

      await expect(facade.getPost('non-existent' as PostId)).rejects.toThrow(EntityNotFoundException);
    });

    it('should hide a draft behind EntityNotFoundException', async () => {
      mockPostRepository.findById = mock(async () => draftPost);

      await expect(facade.getPost('post-1' as PostId)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getPostDetail', () => {
    it('should delegate to findBy slug and return a published post', async () => {
      const result = await facade.getPostDetail('original-title');

      expect(mockPostRepository.findBy).toHaveBeenCalledWith('slug', 'original-title');
      expect(result).toEqual(mockPostDetail);
    });

    it('should throw EntityNotFoundException when the slug does not exist', async () => {
      mockPostRepository.findBy = mock(async () => null);

      await expect(facade.getPostDetail('missing')).rejects.toThrow(EntityNotFoundException);
    });

    it('should hide a draft behind EntityNotFoundException', async () => {
      mockPostRepository.findBy = mock(async () => ({ ...mockPostDetail, status: PostStatus.DRAFT }));

      await expect(facade.getPostDetail('original-title')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getManagedPost', () => {
    const draftDetail = { ...draftPost, author: null, thumbnail: null };

    it('should let the author read their own draft together with its thumbnail and author', async () => {
      mockPostRepository.findDetailById = mock(async () => draftDetail);

      const result = await facade.getManagedPost({ id: 'post-1' as PostId, authorId: 'user-1' as UserId });

      expect(mockPostRepository.findDetailById).toHaveBeenCalledWith('post-1' as PostId);
      expect(result).toEqual(draftDetail);
    });

    it('should let an admin read a draft written by another user', async () => {
      mockPostRepository.findDetailById = mock(async () => draftDetail);
      setRequester(adminUser());

      const result = await facade.getManagedPost({ id: 'post-1' as PostId, authorId: 'admin-user' as UserId });

      expect(result).toEqual(draftDetail);
    });

    it('should throw ForbiddenException for another regular user', async () => {
      mockPostRepository.findDetailById = mock(async () => draftDetail);

      await expect(facade.getManagedPost({ id: 'post-1' as PostId, authorId: 'other-user' as UserId })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw EntityNotFoundException when the post does not exist', async () => {
      mockPostRepository.findDetailById = mock(async () => null);

      await expect(facade.getManagedPost({ id: 'post-1' as PostId, authorId: 'user-1' as UserId })).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('updatePost', () => {
    it('should generate a new slug when the title changes and the post is a draft', async () => {
      mockPostRepository.findById = mock(async () => draftPost);

      const result = await facade.updatePost({
        id: 'post-1' as PostId,
        authorId: 'user-1' as UserId,
        title: 'New Updated Title',
      });

      expect(mockPostRepository.findById).toHaveBeenCalledWith('post-1' as PostId);
      expect(mockTransformService.slugify).toHaveBeenCalledWith('New Updated Title');
      expect(mockPostRepository.update).toHaveBeenCalledWith('post-1' as PostId, {
        title: 'New Updated Title',
        slug: 'new-updated-title',
      });
      expect(result.title).toBe('New Updated Title');
      expect(result.slug).toBe('new-updated-title');
    });

    it('should keep the slug when the title changes on a published post', async () => {
      const result = await facade.updatePost({
        id: 'post-1' as PostId,
        authorId: 'user-1' as UserId,
        title: 'New Updated Title',
      });

      expect(mockTransformService.slugify).not.toHaveBeenCalled();
      expect(mockPostRepository.update).toHaveBeenCalledWith('post-1' as PostId, {
        title: 'New Updated Title',
      });
      expect(result.title).toBe('New Updated Title');
      expect(result.slug).toBe('original-title');
    });

    it('should update other fields without regenerating slug if title is not provided', async () => {
      await facade.updatePost({
        id: 'post-1' as PostId,
        authorId: 'user-1' as UserId,
        content: 'Updated content here.',
      });

      expect(mockTransformService.slugify).not.toHaveBeenCalled();
      expect(mockPostRepository.update).toHaveBeenCalledWith('post-1' as PostId, {
        content: 'Updated content here.',
      });
    });

    it('should throw EntityNotFoundException when post does not exist', async () => {
      mockPostRepository.findById = mock(async () => null);

      await expect(
        facade.updatePost({
          id: 'non-existent' as PostId,
          authorId: 'user-1' as UserId,
          title: 'Title',
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      await expect(
        facade.updatePost({
          id: 'post-1' as PostId,
          authorId: 'different-user' as UserId,
          title: 'Title',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow an admin to update a post written by another user', async () => {
      setRequester(adminUser());

      const result = await facade.updatePost({
        id: 'post-1' as PostId,
        authorId: 'admin-user' as UserId,
        content: 'Moderated content here.',
      });

      expect(mockPostRepository.update).toHaveBeenCalledWith('post-1' as PostId, {
        content: 'Moderated content here.',
      });
      expect(result.content).toBe('Moderated content here.');
    });

    it('should use the role stored in the database, not a role claimed by the token', async () => {
      // DB nói user thường (admin đã bị hạ quyền) nên không được sửa bài người khác.
      setRequester(makeUser({ id: 'demoted-admin' as UserId, role: Role.USER }));

      await expect(
        facade.updatePost({
          id: 'post-1' as PostId,
          authorId: 'demoted-admin' as UserId,
          title: 'Title',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPostRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('changePostStatus', () => {
    it('should publish a draft and set publishedAt for the first time', async () => {
      mockPostRepository.findById = mock(async () => draftPost);

      const result = await facade.changePostStatus({
        id: 'post-1' as PostId,
        authorId: 'user-1' as UserId,
        status: PostStatus.PUBLISHED,
      });

      expect(mockPostRepository.updateStatus).toHaveBeenCalledWith('post-1' as PostId, {
        status: PostStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      });
      expect(result.status).toBe(PostStatus.PUBLISHED);
    });

    it('should keep the original publishedAt when a post is published again', async () => {
      mockPostRepository.findById = mock(async () => ({ ...draftPost, publishedAt }));

      await facade.changePostStatus({
        id: 'post-1' as PostId,
        authorId: 'user-1' as UserId,
        status: PostStatus.PUBLISHED,
      });

      expect(mockPostRepository.updateStatus).toHaveBeenCalledWith('post-1' as PostId, {
        status: PostStatus.PUBLISHED,
        publishedAt,
      });
    });

    it('should unpublish a post and keep its publishedAt', async () => {
      const result = await facade.changePostStatus({
        id: 'post-1' as PostId,
        authorId: 'user-1' as UserId,
        status: PostStatus.DRAFT,
      });

      expect(mockPostRepository.updateStatus).toHaveBeenCalledWith('post-1' as PostId, {
        status: PostStatus.DRAFT,
        publishedAt,
      });
      expect(result.status).toBe(PostStatus.DRAFT);
    });

    it('should do nothing when the post already has the requested status', async () => {
      const result = await facade.changePostStatus({
        id: 'post-1' as PostId,
        authorId: 'user-1' as UserId,
        status: PostStatus.PUBLISHED,
      });

      expect(mockPostRepository.updateStatus).not.toHaveBeenCalled();
      expect(result).toEqual(mockPost);
    });

    it('should refuse to publish a post without a thumbnail', async () => {
      mockPostRepository.findById = mock(async () => ({ ...draftPost, thumbnailId: null }));

      await expect(
        facade.changePostStatus({
          id: 'post-1' as PostId,
          authorId: 'user-1' as UserId,
          status: PostStatus.PUBLISHED,
        }),
      ).rejects.toThrow(PostNotPublishableException);
      expect(mockPostRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user is not the author', async () => {
      mockPostRepository.findById = mock(async () => draftPost);

      await expect(
        facade.changePostStatus({
          id: 'post-1' as PostId,
          authorId: 'different-user' as UserId,
          status: PostStatus.PUBLISHED,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPostRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should allow an admin to change the status of another user post', async () => {
      setRequester(adminUser());

      await facade.changePostStatus({
        id: 'post-1' as PostId,
        authorId: 'admin-user' as UserId,
        status: PostStatus.DRAFT,
      });

      expect(mockPostRepository.updateStatus).toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when the post does not exist', async () => {
      mockPostRepository.findById = mock(async () => null);

      await expect(
        facade.changePostStatus({
          id: 'post-1' as PostId,
          authorId: 'user-1' as UserId,
          status: PostStatus.PUBLISHED,
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('deletePost', () => {
    it('should delete post when user is the author', async () => {
      await facade.deletePost({
        id: 'post-1' as PostId,
        authorId: 'user-1' as UserId,
      });

      expect(mockPostRepository.findById).toHaveBeenCalledWith('post-1' as PostId);
      expect(mockPostRepository.delete).toHaveBeenCalledWith('post-1' as PostId);
    });

    it('should throw EntityNotFoundException when post does not exist', async () => {
      mockPostRepository.findById = mock(async () => null);

      await expect(
        facade.deletePost({
          id: 'non-existent' as PostId,
          authorId: 'user-1' as UserId,
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      await expect(
        facade.deletePost({
          id: 'post-1' as PostId,
          authorId: 'intruder' as UserId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow an admin to delete a post written by another user', async () => {
      setRequester(adminUser());

      await facade.deletePost({
        id: 'post-1' as PostId,
        authorId: 'admin-user' as UserId,
      });

      expect(mockPostRepository.delete).toHaveBeenCalledWith('post-1' as PostId);
    });
  });

  describe('requester checks', () => {
    const userId = 'user-1' as UserId;
    const postId = 'post-1' as PostId;

    const operations: Array<[string, () => Promise<unknown>]> = [
      [
        'createPost',
        () =>
          facade.createPost({
            title: 'New Post',
            content: 'Valid content text here...',
            authorId: userId,
            categoryId: 'Tech' as CategoryId,
            thumbnailId: null,
          }),
      ],
      ['getManagedPost', () => facade.getManagedPost({ id: postId, authorId: userId })],
      ['updatePost', () => facade.updatePost({ id: postId, authorId: userId, title: 'Title' })],
      ['changePostStatus', () => facade.changePostStatus({ id: postId, authorId: userId, status: PostStatus.DRAFT })],
      ['deletePost', () => facade.deletePost({ id: postId, authorId: userId })],
    ];

    const expectNothingWritten = () => {
      expect(mockPostRepository.create).not.toHaveBeenCalled();
      expect(mockPostRepository.update).not.toHaveBeenCalled();
      expect(mockPostRepository.updateStatus).not.toHaveBeenCalled();
      expect(mockPostRepository.delete).not.toHaveBeenCalled();
    };

    for (const [name, run] of operations) {
      it(`${name} rejects a banned requester with ForbiddenException`, async () => {
        setRequester(makeUser({ status: UserStatus.BANNED }));

        await expect(run()).rejects.toThrow(ForbiddenException);
        expectNothingWritten();
      });

      it(`${name} rejects a requester that no longer exists with UnauthorizedException`, async () => {
        setRequester(null);

        await expect(run()).rejects.toThrow(UnauthorizedException);
        expectNothingWritten();
      });
    }
  });
});

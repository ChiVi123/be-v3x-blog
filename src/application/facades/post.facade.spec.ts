import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PostDetail, PostRepository, PostRow } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import type { PostEntity } from '~domain/entities/post.entity';
import { EntityNotFoundException, ForbiddenException } from '~domain/exceptions';
import type { CategoryId, ImageId, PostId, UserId } from '~domain/types/branded';
import { PostFacade } from './post.facade';

describe('PostFacade', () => {
  let facade: PostFacade;
  let mockPostRepository: {
    create: ReturnType<typeof mock>;
    findById: ReturnType<typeof mock>;
    findBy: ReturnType<typeof mock>;
    findAll: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    count: ReturnType<typeof mock>;
  };
  let mockTransformService: { slugify: ReturnType<typeof mock> };

  const mockPost: PostEntity = {
    id: 'post-1' as PostId,
    title: 'Original Title',
    slug: 'original-title',
    content: 'Original content with plenty of detail.',
    categoryId: 'Tech' as CategoryId,
    authorId: 'user-1' as UserId,
    thumbnailId: null as ImageId | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockPostRow: PostRow = {
    id: 'post-1' as PostId,
    title: 'Original Title',
    slug: 'original-title',
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
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    author: null,
    category: null,
    thumbnail: null,
  };

  beforeEach(() => {
    mockPostRepository = {
      create: mock(async (input: unknown) => ({
        ...mockPost,
        ...(input as object),
      })),
      findById: mock(async () => mockPost),
      findBy: mock(async () => mockPostDetail),
      findAll: mock(async () => [mockPostRow]),
      update: mock(async (_id: PostId, input: unknown) => ({
        ...mockPost,
        ...(input as object),
      })),
      delete: mock(async () => undefined),
      count: mock(async () => 1),
    };

    mockTransformService = {
      slugify: mock((text: string) => text.toLowerCase().replace(/\s+/g, '-')),
    };

    facade = new PostFacade(
      mockPostRepository as unknown as PostRepository,
      mockTransformService as unknown as TransformService,
    );
  });

  describe('createPost', () => {
    it('should create post and slugify title', async () => {
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
        content: 'Valid content text here...',
        authorId: 'user-1' as UserId,
        categoryId: 'Tech' as CategoryId,
        thumbnailId: null,
        slug: 'new-post',
      });
      expect(result.slug).toBe('new-post');
    });
  });

  describe('listPosts', () => {
    it('should return posts and apply default page and limit', async () => {
      const result = await facade.listPosts({});

      expect(mockPostRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        author: undefined,
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
      });
      expect(result).toEqual({ data: [mockPostRow] });
    });
  });

  describe('queryPosts', () => {
    it('should query posts and return total count', async () => {
      const result = await facade.queryPosts({ page: 1, limit: 10 });

      expect(mockPostRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual({ data: [mockPostRow], total: 1 });
    });
  });

  describe('getPost', () => {
    it('should return post when found', async () => {
      const result = await facade.getPost('post-1' as PostId);

      expect(mockPostRepository.findById).toHaveBeenCalledWith('post-1' as PostId);
      expect(result).toEqual(mockPost);
    });

    it('should throw EntityNotFoundException when post not found', async () => {
      mockPostRepository.findById = mock(async () => null);

      expect(facade.getPost('non-existent' as PostId)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getPostDetail', () => {
    it('should delegate to findBy slug', async () => {
      const result = await facade.getPostDetail('original-title');

      expect(mockPostRepository.findBy).toHaveBeenCalledWith('slug', 'original-title');
      expect(result).toEqual(mockPostDetail);
    });
  });

  describe('updatePost', () => {
    it('should update post and generate new slug when title changes', async () => {
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

      expect(
        facade.updatePost({
          id: 'non-existent' as PostId,
          authorId: 'user-1' as UserId,
          title: 'Title',
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      expect(
        facade.updatePost({
          id: 'post-1' as PostId,
          authorId: 'different-user' as UserId,
          title: 'Title',
        }),
      ).rejects.toThrow(ForbiddenException);
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

      expect(
        facade.deletePost({
          id: 'non-existent' as PostId,
          authorId: 'user-1' as UserId,
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      expect(
        facade.deletePost({
          id: 'post-1' as PostId,
          authorId: 'intruder' as UserId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

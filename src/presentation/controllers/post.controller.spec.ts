import 'reflect-metadata';

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import { PostFacade } from '~application/facades/post.facade';
import type { PostDetail, PostRow } from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import type { CategoryId, ImageId, PostId, UserId } from '~domain/types/branded';
import { AUTH_SERVICE_TOKEN } from '~infrastructure/config/provider-tokens';
import { PostController } from '~presentation/controllers/post.controller';
import type { CreatePostDto } from '~presentation/dtos/post/post.dto';
import { JwtAuthGuard } from '~presentation/guards';

describe('PostController', () => {
  let controller: PostController;
  let mockPostFacade: {
    createPost: ReturnType<typeof mock>;
    listPosts: ReturnType<typeof mock>;
    queryPosts: ReturnType<typeof mock>;
    getPost: ReturnType<typeof mock>;
    getPostDetail: ReturnType<typeof mock>;
    updatePost: ReturnType<typeof mock>;
    deletePost: ReturnType<typeof mock>;
  };

  const mockPost: PostEntity = {
    id: 'post-1' as PostId,
    title: 'Test Post',
    slug: 'test-post',
    content: 'Valid content that has more than twenty characters.',
    readingTime: 5,
    categoryId: 'Tech' as CategoryId,
    authorId: 'user-1' as UserId,
    thumbnailId: null as ImageId | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockPostRow: PostRow = {
    id: 'post-1' as PostId,
    title: 'Test Post',
    slug: 'test-post',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    readingTime: 5,
    author: null,
    category: null,
    thumbnail: null,
  };

  const mockPostDetail: PostDetail = {
    id: 'post-1' as PostId,
    title: 'Test Post',
    slug: 'test-post',
    content: 'Valid content that has more than twenty characters.',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    readingTime: 5,
    author: null,
    category: null,
    thumbnail: null,
  };

  beforeEach(async () => {
    mockPostFacade = {
      createPost: mock(async () => mockPost),
      listPosts: mock(async () => ({ data: [mockPostRow] })),
      queryPosts: mock(async () => ({ data: [mockPostRow], total: 1 })),
      getPost: mock(async () => mockPost),
      getPostDetail: mock(async () => mockPostDetail),
      updatePost: mock(async () => ({ ...mockPost, title: 'Updated Title' })),
      deletePost: mock(async () => undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostFacade,
          useValue: mockPostFacade,
        },
        {
          provide: AUTH_SERVICE_TOKEN,
          useValue: {
            verifyAccessToken: mock(async () => ({
              id: 'user-1' as UserId,
              email: 'test@example.com',
            })),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PostController>(PostController);
  });

  describe('getListPost', () => {
    it('should delegate query parameters to postFacade.listPosts', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.getListPost(query);

      expect(mockPostFacade.listPosts).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [mockPostRow] });
    });
  });

  describe('getAllPost', () => {
    it('should delegate query parameters to postFacade.queryPosts', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.getAllPost(query);

      expect(mockPostFacade.queryPosts).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [mockPostRow], total: 1 });
    });
  });

  describe('getPostById', () => {
    it('should delegate id to postFacade.getPost', async () => {
      const postId = 'post-1' as PostId;
      const result = await controller.getPostById(postId);

      expect(mockPostFacade.getPost).toHaveBeenCalledWith(postId);
      expect(result).toEqual(mockPost);
    });
  });

  describe('getPostBySlug', () => {
    it('should delegate slug to postFacade.getPostDetail', async () => {
      const slug = 'test-post';
      const result = await controller.getPostBySlug(slug);

      expect(mockPostFacade.getPostDetail).toHaveBeenCalledWith(slug);
      expect(result).toEqual(mockPostDetail);
    });
  });

  describe('createPost', () => {
    it('should attach authenticated userId and delegate to postFacade.createPost', async () => {
      const body: CreatePostDto = {
        title: 'Test Post',
        content: 'Valid content that has more than twenty characters.',
        categoryId: 'Tech' as CategoryId,
        thumbnailId: null,
      };
      const userId = 'user-1' as UserId;

      const result = await controller.createPost(body, userId);

      expect(mockPostFacade.createPost).toHaveBeenCalledWith({
        ...body,
        authorId: userId,
      });
      expect(result).toEqual(mockPost);
    });
  });

  describe('updatePost', () => {
    it('should attach id and authorId and delegate to postFacade.updatePost', async () => {
      const postId = 'post-1' as PostId;
      const userId = 'user-1' as UserId;
      const body = { title: 'Updated Title' };

      const result = await controller.updatePost(postId, body, userId);

      expect(mockPostFacade.updatePost).toHaveBeenCalledWith({
        id: postId,
        authorId: userId,
        ...body,
      });
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('deletePost', () => {
    it('should attach id and authorId and delegate to postFacade.deletePost', async () => {
      const postId = 'post-1' as PostId;
      const userId = 'user-1' as UserId;

      await controller.deletePost(postId, userId);

      expect(mockPostFacade.deletePost).toHaveBeenCalledWith({
        id: postId,
        authorId: userId,
      });
    });
  });
});

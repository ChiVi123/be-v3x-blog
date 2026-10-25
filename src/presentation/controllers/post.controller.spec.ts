import 'reflect-metadata';

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import type { PostDetail, PostRow } from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import type { CategoryId, ImageId, PostId, UserId } from '~domain/types/branded';
import {
  AUTH_SERVICE_TOKEN,
  CREATE_POST_USE_CASE_TOKEN,
  DELETE_POST_USE_CASE_TOKEN,
  GET_POST_DETAIL_USE_CASE_TOKEN,
  GET_POST_USE_CASE_TOKEN,
  LIST_POST_USE_CASE_TOKEN,
  QUERY_POST_USE_CASE_TOKEN,
  UPDATE_POST_USE_CASE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { PostController } from '~presentation/controllers/post.controller';
import type { CreatePostRequest } from '~presentation/dtos/post/post.dto';
import { JwtAuthGuard } from '~presentation/guards';

describe('PostController', () => {
  let controller: PostController;
  let mockCreatePostUseCase: { execute: ReturnType<typeof mock> };
  let mockListPostUseCase: { execute: ReturnType<typeof mock> };
  let mockQueryPostUseCase: { execute: ReturnType<typeof mock> };
  let mockGetPostUseCase: { execute: ReturnType<typeof mock> };
  let mockGetPostDetailUseCase: { execute: ReturnType<typeof mock> };
  let mockUpdatePostUseCase: { execute: ReturnType<typeof mock> };
  let mockDeletePostUseCase: { execute: ReturnType<typeof mock> };

  const mockPost: PostEntity = {
    id: 'post-1' as PostId,
    title: 'Test Post',
    slug: 'test-post',
    content: 'Valid content that has more than twenty characters.',
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
    author: null,
    category: null,
    thumbnail: null,
  };

  beforeEach(async () => {
    mockCreatePostUseCase = {
      execute: mock(async () => mockPost),
    };
    mockListPostUseCase = {
      execute: mock(async () => ({ data: [mockPostRow] })),
    };
    mockQueryPostUseCase = {
      execute: mock(async () => ({ data: [mockPostRow], total: 1 })),
    };
    mockGetPostUseCase = {
      execute: mock(async () => mockPost),
    };
    mockGetPostDetailUseCase = {
      execute: mock(async () => mockPostDetail),
    };
    mockUpdatePostUseCase = {
      execute: mock(async () => ({ ...mockPost, title: 'Updated Title' })),
    };
    mockDeletePostUseCase = {
      execute: mock(async () => undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: CREATE_POST_USE_CASE_TOKEN,
          useValue: mockCreatePostUseCase,
        },
        {
          provide: LIST_POST_USE_CASE_TOKEN,
          useValue: mockListPostUseCase,
        },
        {
          provide: QUERY_POST_USE_CASE_TOKEN,
          useValue: mockQueryPostUseCase,
        },
        {
          provide: GET_POST_USE_CASE_TOKEN,
          useValue: mockGetPostUseCase,
        },
        {
          provide: GET_POST_DETAIL_USE_CASE_TOKEN,
          useValue: mockGetPostDetailUseCase,
        },
        {
          provide: UPDATE_POST_USE_CASE_TOKEN,
          useValue: mockUpdatePostUseCase,
        },
        {
          provide: DELETE_POST_USE_CASE_TOKEN,
          useValue: mockDeletePostUseCase,
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
    it('should delegate query parameters to listPostUseCase', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.getListPost(query);

      expect(mockListPostUseCase.execute).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [mockPostRow] });
    });
  });

  describe('getAllPost', () => {
    it('should delegate query parameters to queryPostUseCase', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.getAllPost(query);

      expect(mockQueryPostUseCase.execute).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [mockPostRow], total: 1 });
    });
  });

  describe('getPostById', () => {
    it('should delegate id to getPostUseCase', async () => {
      const postId = 'post-1' as PostId;
      const result = await controller.getPostById(postId);

      expect(mockGetPostUseCase.execute).toHaveBeenCalledWith(postId);
      expect(result).toEqual(mockPost);
    });
  });

  describe('getPostBySlug', () => {
    it('should delegate slug to getPostDetailUseCase', async () => {
      const slug = 'test-post';
      const result = await controller.getPostBySlug(slug);

      expect(mockGetPostDetailUseCase.execute).toHaveBeenCalledWith(slug);
      expect(result).toEqual(mockPostDetail);
    });
  });

  describe('createPost', () => {
    it('should attach authenticated userId and delegate to createPostUseCase', async () => {
      const body: CreatePostRequest = {
        title: 'Test Post',
        content: 'Valid content that has more than twenty characters.',
        categoryId: 'Tech' as CategoryId,
        thumbnailId: null,
      };
      const userId = 'user-1' as UserId;

      const result = await controller.createPost(body, userId);

      expect(mockCreatePostUseCase.execute).toHaveBeenCalledWith({
        ...body,
        authorId: userId,
      });
      expect(result).toEqual(mockPost);
    });
  });

  describe('updatePost', () => {
    it('should attach id and authorId and delegate to updatePostUseCase', async () => {
      const postId = 'post-1' as PostId;
      const userId = 'user-1' as UserId;
      const body = { title: 'Updated Title' };

      const result = await controller.updatePost(postId, body, userId);

      expect(mockUpdatePostUseCase.execute).toHaveBeenCalledWith({
        id: postId,
        authorId: userId,
        ...body,
      });
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('deletePost', () => {
    it('should attach id and authorId and delegate to deletePostUseCase', async () => {
      const postId = 'post-1' as PostId;
      const userId = 'user-1' as UserId;

      await controller.deletePost(postId, userId);

      expect(mockDeletePostUseCase.execute).toHaveBeenCalledWith({
        id: postId,
        authorId: userId,
      });
    });
  });
});

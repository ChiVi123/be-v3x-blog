import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PostRepository } from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import type { ImageId, PostId, UserId } from '~domain/types/branded';
import { ListPostUseCase } from './list-post.use-case';

describe('ListPostUseCase', () => {
  let useCase: ListPostUseCase;
  let mockPostRepository: { findAll: ReturnType<typeof mock> };

  const mockPosts: PostEntity[] = [
    {
      id: 'post-1' as PostId,
      title: 'First Post',
      slug: 'first-post',
      content: 'This is the first post content.',
      category: 'Tech',
      authorId: 'user-1' as UserId,
      thumbnailId: null as ImageId | null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
  ];

  beforeEach(() => {
    mockPostRepository = {
      findAll: mock(async () => mockPosts),
    };
    useCase = new ListPostUseCase(mockPostRepository as unknown as PostRepository);
  });

  it('should return posts and apply default page and limit', async () => {
    const result = await useCase.execute({});

    expect(mockPostRepository.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      author: undefined,
    });
    expect(result).toEqual({ data: mockPosts });
  });

  it('should pass custom pagination and author filter to repository', async () => {
    const authorId = 'author-123' as UserId;
    const result = await useCase.execute({ page: 2, limit: 20, author: authorId });

    expect(mockPostRepository.findAll).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      author: authorId,
    });
    expect(result).toEqual({ data: mockPosts });
  });
});

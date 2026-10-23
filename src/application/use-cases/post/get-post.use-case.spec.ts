import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PostRepository } from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import { EntityNotFoundException } from '~domain/exceptions';
import type { CategoryId, ImageId, PostId, UserId } from '~domain/types/branded';
import { GetPostUseCase } from './get-post.use-case';

describe('GetPostUseCase', () => {
  let useCase: GetPostUseCase;
  let mockPostRepository: { findById: ReturnType<typeof mock> };

  const mockPost: PostEntity = {
    id: 'post-1' as PostId,
    title: 'Test Post',
    slug: 'test-post',
    content: 'Content with enough length.',
    categoryId: 'Tech' as CategoryId,
    authorId: 'user-1' as UserId,
    thumbnailId: null as ImageId | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockPostRepository = {
      findById: mock(async () => mockPost),
    };
    useCase = new GetPostUseCase(mockPostRepository as unknown as PostRepository);
  });

  it('should return post when found', async () => {
    const result = await useCase.execute('post-1' as PostId);

    expect(mockPostRepository.findById).toHaveBeenCalledWith('post-1' as PostId);
    expect(result).toEqual(mockPost);
  });

  it('should throw EntityNotFoundException when post not found', async () => {
    mockPostRepository.findById = mock(async () => null);

    expect(useCase.execute('non-existent' as PostId)).rejects.toThrow(EntityNotFoundException);
  });
});

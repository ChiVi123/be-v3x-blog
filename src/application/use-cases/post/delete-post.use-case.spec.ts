import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PostRepository } from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import { EntityNotFoundException, ForbiddenException } from '~domain/exceptions';
import type { ImageId, PostId, UserId } from '~domain/types/branded';
import { DeletePostUseCase } from './delete-post.use-case';

describe('DeletePostUseCase', () => {
  let useCase: DeletePostUseCase;
  let mockPostRepository: { findById: ReturnType<typeof mock>; delete: ReturnType<typeof mock> };

  const mockPost: PostEntity = {
    id: 'post-1' as PostId,
    title: 'Post To Delete',
    slug: 'post-to-delete',
    content: 'Content to be deleted.',
    category: 'Tech',
    authorId: 'user-1' as UserId,
    thumbnailId: null as ImageId | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockPostRepository = {
      findById: mock(async () => mockPost),
      delete: mock(async () => undefined),
    };

    useCase = new DeletePostUseCase(mockPostRepository as unknown as PostRepository);
  });

  it('should delete post when user is the author', async () => {
    await useCase.execute({
      id: 'post-1' as PostId,
      authorId: 'user-1' as UserId,
    });

    expect(mockPostRepository.findById).toHaveBeenCalledWith('post-1' as PostId);
    expect(mockPostRepository.delete).toHaveBeenCalledWith('post-1' as PostId);
  });

  it('should throw EntityNotFoundException when post does not exist', async () => {
    mockPostRepository.findById = mock(async () => null);

    expect(
      useCase.execute({
        id: 'non-existent' as PostId,
        authorId: 'user-1' as UserId,
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('should throw ForbiddenException when user is not the author', async () => {
    expect(
      useCase.execute({
        id: 'post-1' as PostId,
        authorId: 'intruder' as UserId,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

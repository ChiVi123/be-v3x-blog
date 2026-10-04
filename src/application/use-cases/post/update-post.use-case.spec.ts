import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PostRepository } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import type { PostEntity } from '~domain/entities/post.entity';
import { EntityNotFoundException, ForbiddenException } from '~domain/exceptions';
import type { ImageId, PostId, UserId } from '~domain/types/branded';
import { UpdatePostUseCase } from './update-post.use-case';

describe('UpdatePostUseCase', () => {
  let useCase: UpdatePostUseCase;
  let mockPostRepository: { findById: ReturnType<typeof mock>; update: ReturnType<typeof mock> };
  let mockTransformService: { slugify: ReturnType<typeof mock> };

  const mockPost: PostEntity = {
    id: 'post-1' as PostId,
    title: 'Original Title',
    slug: 'original-title',
    content: 'Original content with plenty of detail.',
    category: 'Tech',
    authorId: 'user-1' as UserId,
    thumbnailId: null as ImageId | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockPostRepository = {
      findById: mock(async () => mockPost),
      update: mock(async (_id: PostId, input: unknown) => ({
        ...mockPost,
        ...(input as object),
      })),
    };
    mockTransformService = {
      slugify: mock((text: string) => text.toLowerCase().replace(/\s+/g, '-')),
    };

    useCase = new UpdatePostUseCase(
      mockPostRepository as unknown as PostRepository,
      mockTransformService as unknown as TransformService,
    );
  });

  it('should update post and generate new slug when title changes', async () => {
    const result = await useCase.execute({
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
    await useCase.execute({
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
      useCase.execute({
        id: 'non-existent' as PostId,
        authorId: 'user-1' as UserId,
        title: 'Title',
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('should throw ForbiddenException when user is not the author', async () => {
    expect(
      useCase.execute({
        id: 'post-1' as PostId,
        authorId: 'different-user' as UserId,
        title: 'Title',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

import type { PostRepository } from '~application/repositories/post.repository';
import { EntityNotFoundException, ForbiddenException } from '~domain/exceptions';
import type { PostId, UserId } from '~domain/types/branded';

export type DeletePostParams = {
  id: PostId;
  authorId: UserId;
};

export class DeletePostUseCase {
  constructor(private readonly postRepository: PostRepository) {}

  async execute({ id, authorId }: DeletePostParams): Promise<void> {
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

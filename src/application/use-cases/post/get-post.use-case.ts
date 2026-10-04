import type { PostRepository } from '~application/repositories/post.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import { EntityNotFoundException } from '~domain/exceptions';
import type { PostId } from '~domain/types/branded';

export class GetPostUseCase {
  constructor(private readonly postRepository: PostRepository) {}

  async execute(id: PostId): Promise<PostEntity> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new EntityNotFoundException('Post', id);
    }
    return post;
  }
}

import type { PostInput, PostRepository } from '~application/repositories/post.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { PostEntity } from '~domain/entities/post.entity';
import type { UserId } from '~domain/types/branded';

export class CreatePostUseCase {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(post: PostInput, authorId: UserId): Promise<PostEntity> {
    const user = await this.userRepository.findById(authorId);
    if (!user) {
      throw new Error(`User with ID ${authorId} not found`);
    }
    const postEntity = await this.postRepository.create(post);
    return postEntity;
  }
}

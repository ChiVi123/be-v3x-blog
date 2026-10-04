import type { PostRepository } from '~application/repositories/post.repository';
import type { UserId } from '~domain/types/branded';

export interface ListPostInput {
  page?: number;
  limit?: number;
  author?: UserId;
}

export class ListPostUseCase {
  constructor(private readonly postRepository: PostRepository) {}

  async execute(input: ListPostInput) {
    const { page = 1, limit = 10, author } = input;
    const posts = await this.postRepository.findAll({ page, limit, author });

    return {
      data: posts,
    };
  }
}

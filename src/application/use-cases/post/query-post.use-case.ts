import type { PostQuery, PostRepository, PostRow } from '~application/repositories/post.repository';

export class QueryPostUseCase {
  constructor(private readonly postRepository: PostRepository) {}

  async execute(query: PostQuery): Promise<{ data: PostRow[]; total: number }> {
    const posts = await this.postRepository.findAll(query);
    return { data: posts, total: posts.length };
  }
}

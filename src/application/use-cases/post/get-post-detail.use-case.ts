import type { PostDetail, PostRepository } from '~application/repositories/post.repository';

export class GetPostDetailUseCase {
  constructor(private readonly repository: PostRepository) {}

  async execute(slug: string): Promise<PostDetail | null> {
    const post = await this.repository.findBy('slug', slug);
    return post;
  }
}

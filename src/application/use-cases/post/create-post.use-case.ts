import type { PostRepository } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import type { PostEntity } from '~domain/entities/post.entity';
import type { CategoryId, ImageId, UserId } from '~domain/types/branded';

type PostParams = {
  title: string;
  content: string;
  authorId: UserId;
  categoryId: CategoryId;
  thumbnailId: ImageId | null;
};

export class CreatePostUseCase {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly transformService: TransformService,
  ) {}

  async execute(post: PostParams): Promise<PostEntity> {
    const slug = this.transformService.slugify(post.title);
    const postEntity = await this.postRepository.create({ ...post, slug });
    return postEntity;
  }
}

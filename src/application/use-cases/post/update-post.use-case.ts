import type { PostRepository, PostUpdateInput } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import type { PostEntity } from '~domain/entities/post.entity';
import { EntityNotFoundException, ForbiddenException } from '~domain/exceptions';
import type { ImageId, PostId, UserId } from '~domain/types/branded';

export type UpdatePostParams = {
  id: PostId;
  authorId: UserId;
  title?: string;
  content?: string;
  category?: string;
  thumbnailId?: ImageId | null;
};

export class UpdatePostUseCase {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly transformService: TransformService,
  ) {}

  async execute(params: UpdatePostParams): Promise<PostEntity> {
    const { id, authorId, ...updateData } = params;

    const existingPost = await this.postRepository.findById(id);
    if (!existingPost) {
      throw new EntityNotFoundException('Post', id);
    }

    if (existingPost.authorId !== authorId) {
      throw new ForbiddenException('You are not allowed to update this post');
    }

    const updatePayload: PostUpdateInput = { ...updateData };
    if (updateData.title) {
      updatePayload.slug = this.transformService.slugify(updateData.title);
    }

    return this.postRepository.update(id, updatePayload);
  }
}

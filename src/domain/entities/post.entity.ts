import type { ImageId, PostId, UserId } from '~domain/types/branded';
import type { BaseEntity } from './base.entity';

export interface PostEntity extends BaseEntity<PostId> {
  title: string;
  slug: string;
  content: string;
  category: string;
  authorId: UserId;
  thumbnailId: ImageId | null;
}

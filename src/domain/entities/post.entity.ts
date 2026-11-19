import type { CategoryId, ImageId, PostId, UserId } from '~domain/types/branded';
import type { BaseEntity } from './base.entity';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export interface PostEntity extends BaseEntity<PostId> {
  title: string;
  slug: string;
  content: string;
  readingTime: number;
  status: PostStatus;
  publishedAt: Date | null;
  categoryId: CategoryId;
  authorId: UserId;
  thumbnailId: ImageId | null;
}

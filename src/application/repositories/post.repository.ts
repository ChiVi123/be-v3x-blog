import type { PaginationQuery } from '~application/types/pagination';
import type { PostEntity } from '~domain/entities/post.entity';
import type { PostId, UserId } from '~domain/types/branded';

export interface PostRepository {
  create(post: PostInput): Promise<PostEntity>;
  update(id: PostId, post: PostUpdateInput): Promise<PostEntity>;
  delete(id: PostId): Promise<void>;
  findById(id: PostId): Promise<PostEntity | null>;
  findAll(query: PostQuery): Promise<PostEntity[]>;
  findByUserId(userId: UserId): Promise<PostEntity[]>;
}

export type PostQuery = PaginationQuery & {
  author?: UserId;
};

export type PostInput = Omit<PostEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type PostUpdateInput = Partial<Omit<PostEntity, 'id' | 'createdAt' | 'updatedAt' | 'authorId'>>;

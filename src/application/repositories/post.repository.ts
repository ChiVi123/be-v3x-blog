import type { PaginationQuery } from '~application/types/pagination';
import type { CategoryEntity, ImageEntity, PostEntity, UserEntity } from '~domain/entities';
import type { CategoryId, PostId, UserId } from '~domain/types/branded';

export interface PostRepository {
  create(post: PostInput): Promise<PostEntity>;
  update(id: PostId, post: PostUpdateInput): Promise<PostEntity>;
  delete(id: PostId): Promise<void>;
  findById(id: PostId): Promise<PostEntity | null>;
  findBy<Key extends keyof PostEntity, Value extends PostEntity[Key]>(
    key: Key,
    value: Value,
  ): Promise<PostDetail | null>;
  findAll(query: PostQuery): Promise<PostRow[]>;
  findByUserId(userId: UserId): Promise<PostRow[]>;
  count(query: PostQuery): Promise<number>;
}

export type PostQuery = PaginationQuery<Pick<PostEntity, 'title' | 'createdAt' | 'updatedAt' | 'id'>> & {
  author?: UserId;
  category?: CategoryId;
};

export type PostInput = Omit<PostEntity, 'id' | 'readingTime' | 'createdAt' | 'updatedAt'>;
export type PostUpdateInput = Partial<Omit<PostEntity, 'id' | 'createdAt' | 'updatedAt' | 'authorId'>>;
export type PostRow = Omit<PostEntity, 'authorId' | 'thumbnailId' | 'categoryId' | 'content'> & {
  author: Omit<UserEntity, 'password'> | null;
  category: CategoryEntity | null;
  thumbnail: ImageEntity | null;
};
export type PostDetail = Omit<PostEntity, 'authorId' | 'thumbnailId' | 'categoryId'> & {
  author: Omit<UserEntity, 'password'> | null;
  category: CategoryEntity | null;
  thumbnail: ImageEntity | null;
};

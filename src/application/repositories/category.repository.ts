import type { PaginationQuery } from '~application/types/pagination';
import type { CategoryEntity } from '~domain/entities';
import type { CategoryId } from '~domain/types/branded';

export interface CategoryRepository {
  create(category: CategoryInput): Promise<CategoryEntity>;
  update(id: CategoryId, category: CategoryInput): Promise<CategoryEntity>;
  delete(id: CategoryId): Promise<void>;
  findById(id: CategoryId): Promise<CategoryDetail | null>;
  findAll(): Promise<CategoryRow[]>;
  findBySlug(slug: string): Promise<CategoryDetail | null>;
}

export type CategoryInput = Omit<CategoryEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type CategoryQuery = PaginationQuery;
export type CategoryRow = Pick<CategoryEntity, 'id' | 'name'> & { postsCount: number };
export type CategoryDetail = CategoryEntity;

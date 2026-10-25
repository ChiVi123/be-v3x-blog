import type { BaseEntity } from '~domain/entities/base.entity';
import type { CategoryId } from '~domain/types/branded';

export interface CategoryEntity extends BaseEntity<CategoryId> {
  name: string;
  slug: string;
}

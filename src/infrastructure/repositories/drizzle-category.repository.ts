import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type {
  CategoryDetail,
  CategoryInput,
  CategoryRepository,
  CategoryRow,
} from '~application/repositories/category.repository';
import type { CategoryEntity } from '~domain/entities';
import type { CategoryId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { categories } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

const RETURNING_DETAILS = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
};

@Injectable()
export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}
  async create(category: CategoryInput): Promise<CategoryEntity> {
    const [result] = await this.db.insert(categories).values(category).returning(RETURNING_DETAILS);
    return result;
  }
  async update(id: CategoryId, category: CategoryInput): Promise<CategoryEntity> {
    const [result] = await this.db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning(RETURNING_DETAILS);
    return result;
  }
  async delete(id: CategoryId): Promise<void> {
    await this.db.delete(categories).where(eq(categories.id, id));
  }
  async findById(id: CategoryId): Promise<CategoryDetail | null> {
    const data = await this.db.query.categories.findFirst({ where: { id: { eq: id } } });
    return data ?? null;
  }
  async findAll(): Promise<CategoryRow[]> {
    const data = await this.db.query.categories.findMany();
    return data;
  }
  async findBySlug(slug: string): Promise<CategoryDetail | null> {
    const data = await this.db.query.categories.findFirst({ where: { slug: { eq: slug } } });
    return data ?? null;
  }
}

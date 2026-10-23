import { random, randomDate } from 'seed/utils';
import slugify from 'slugify';
import { categories } from '~infrastructure/database/drizzle/schema';
import type { CategoryInput, DrizzleDB } from '~infrastructure/database/drizzle/types';
import data from './data/categories';

export async function categoriesSeed(db: DrizzleDB) {
  const dateNow = new Date();
  const createAt = randomDate(new Date('2025-01-01'), dateNow);
  const dataSeeded = data.map<CategoryInput>((category) => ({
    name: category,
    slug: slugify(category),
    createdAt: createAt,
    updatedAt: random([undefined, randomDate(createAt, dateNow)]),
  }));

  await db.insert(categories).values(dataSeeded);
}

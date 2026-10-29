import { createSlug, random, randomDate } from 'seed/utils';
import { categories } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

type DbExecutor = DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

export async function batchCategorySeeding(db: DbExecutor, categoryNames: string[]) {
  if (categoryNames.length === 0) return [];
  const now = new Date();

  const values = categoryNames.map((name) => {
    const createdAt = randomDate(new Date('2025-01-01'), now);
    return {
      name,
      slug: createSlug(name),
      createdAt,
      updatedAt: random([undefined, randomDate(createdAt, now)]),
    };
  });

  return await db
    .insert(categories)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: categories.id, name: categories.name });
}

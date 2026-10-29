import { createSlug, random, randomDate } from 'seed/utils';
import type { CategoryId, ImageId, UserId } from '~domain/types/branded';
import { posts } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

export type PostSeedData = {
  title: string;
  content: string;
  readingTime: number;
  authorId: UserId;
  categoryId: CategoryId;
  thumbnailId?: ImageId;
};

type DbExecutor = DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

export async function batchPostSeeding(db: DbExecutor, dataList: PostSeedData[], chunkSize = 100) {
  if (dataList.length === 0) return;
  const now = new Date();

  const seenSlugs = new Set<string>();
  const values = dataList.map((item) => {
    let slug = createSlug(item.title);
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }
    seenSlugs.add(slug);

    const createdAt = randomDate(new Date('2025-01-01'), now);
    return {
      title: item.title,
      slug,
      content: item.content,
      readingTime: item.readingTime,
      authorId: item.authorId,
      categoryId: item.categoryId,
      thumbnailId: item.thumbnailId,
      createdAt,
      updatedAt: random([undefined, randomDate(createdAt, now)]),
    };
  });

  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    await db.insert(posts).values(chunk).onConflictDoNothing();
  }
}

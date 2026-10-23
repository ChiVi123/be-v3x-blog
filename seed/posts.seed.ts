import { count } from 'drizzle-orm';
import { random, randomDate, randomParagraph } from 'seed/utils';
import slugify from 'slugify';
import { posts } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB, PostInput } from '~infrastructure/database/drizzle/types';
import data from './data/posts';

export async function postsSeed(db: DrizzleDB) {
  const [categories, users] = await Promise.all([
    db.query.categories.findMany({ columns: { id: true } }),
    db.query.users.findMany({ columns: { id: true } }),
  ]);

  if (categories.length === 0 || users.length === 0) {
    throw new Error('Categories or users not found');
  }

  const dataSeeded = data.map<PostInput>((post) => {
    const dateNow = new Date();
    const createAt = randomDate(new Date('2025-01-01'), dateNow);

    return {
      title: post,
      slug: slugify(post),
      content: randomParagraph(4, 10),
      categoryId: random(categories).id,
      authorId: random(users).id,
      createdAt: createAt,
      updatedAt: random([undefined, randomDate(createAt, dateNow)]),
    };
  });

  await db.insert(posts).values(dataSeeded);

  const postCount = await db.select({ value: count() }).from(posts);
  console.log(`Post count: ${postCount[0].value}`);
}

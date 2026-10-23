import { eq } from 'drizzle-orm';
import { images, posts } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';
import { random } from './utils';

export async function PostImagesSeed(db: DrizzleDB) {
  const postIds = await db.query.posts.findMany({ columns: { id: true } });
  let postImageCount = 0;

  for (const { id: postId } of postIds) {
    const [newImage] = await db
      .insert(images)
      .values({
        alt: `Image for post ${postId}`,
        metadata: {
          width: 1920,
          height: 1080,
          format: random(['image/jpeg', 'image/png', 'image/webp']),
          size: random([100, 200, 300]),
        },
        remoteKey: `thumbnail-default_${postId}`,
        url: 'https://res.cloudinary.com/dk4kov4pe/image/upload/v1792396555/thumbnail-default_ecfgcp.jpg',
      })
      .returning({ id: images.id });

    await db.update(posts).set({ thumbnailId: newImage.id }).where(eq(posts.id, postId));

    postImageCount++;
  }

  console.log(`Post Image count: ${postImageCount}`);
}

import { random, randomDate } from 'seed/utils';
import type { ImageMetadata } from '~domain/entities/image.entity';
import { images } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

export type ImageSeedData = {
  remoteKey: string;
  url: string;
  alt: string;
  metadata?: ImageMetadata;
};

type DbExecutor = DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

export async function batchImageSeeding(db: DbExecutor, dataList: ImageSeedData[]) {
  if (dataList.length === 0) return [];
  const now = new Date();

  const values = dataList.map((item) => {
    const createdAt = randomDate(new Date('2025-01-01'), now);
    return {
      remoteKey: item.remoteKey,
      url: item.url,
      alt: item.alt,
      metadata: item.metadata ?? { width: 1200, height: 630, format: 'png', size: 102400 },
      createdAt,
      updatedAt: random([undefined, randomDate(createdAt, now)]),
    };
  });

  return await db
    .insert(images)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: images.id, remoteKey: images.remoteKey });
}

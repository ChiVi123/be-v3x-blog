import 'dotenv/config';
import { createReadStream } from 'node:fs';
import bcrypt from 'bcrypt';
import { parse } from 'csv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { batchCategorySeeding } from 'seed/categories.seed';
import { batchImageSeeding } from 'seed/images.seed';
import { batchPostSeeding } from 'seed/posts.seed';
import { batchUserSeeding } from 'seed/users.seed';
import { logger, resetPgDatabase } from 'seed/utils';
import { ParsedArraySchema, PasswordSchema } from 'seed/validate';
import type { CategoryId, ImageId, UserId } from '~domain/types/branded';
import { relations } from '~infrastructure/database/drizzle/relations';
import * as schema from '~infrastructure/database/drizzle/schema';

type RawRow = {
  title: string;
  content: string;
  category: string;
  authorUsername: string;
  authorEmail: string;
  authorBio: string;
  readingTime: string;
  imageUrl: string;
  imageRemoteKey: string;
};

const DEFAULT_PASSWORD = PasswordSchema.parse(process.env.SEED_PASSWORD);

(async () => {
  const pgPool = new Pool({ connectionString: process.env.DB_URL! });
  const pgDB = drizzle({ client: pgPool, relations });

  try {
    await resetPgDatabase(pgDB, schema);
    logger.log('Database reset completed');

    const rows = await new Promise<RawRow[]>((resolve, reject) => {
      const records: RawRow[] = [];
      createReadStream('seed/data/tech_articles_dataset.csv')
        .pipe(parse({ columns: true, bom: true }))
        .on('data', (row) => records.push(row))
        .on('error', (error) => {
          logger.error(error);
          reject(error);
        })
        .on('end', () => resolve(records));
    });

    const parsedRows = ParsedArraySchema.parse(rows);
    logger.log(`Parsed ${parsedRows.length} rows from CSV`);

    // 1. Hash password một lần duy nhất cho toàn bộ user seed
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    // 2. Trích xuất danh sách duy nhất các bảng cha (Categories, Users, Images)
    const uniqueCategoriesSet = new Set<string>();
    const uniqueUsersMap = new Map<string, { username: string; email: string; bio: string }>();
    const uniqueImagesMap = new Map<string, { remoteKey: string; url: string; alt: string }>();

    for (const row of parsedRows) {
      uniqueCategoriesSet.add(row.category);

      if (!uniqueUsersMap.has(row.authorEmail)) {
        uniqueUsersMap.set(row.authorEmail, {
          username: row.authorUsername,
          email: row.authorEmail,
          bio: row.authorBio,
        });
      }

      if (row.imageRemoteKey && !uniqueImagesMap.has(row.imageRemoteKey)) {
        uniqueImagesMap.set(row.imageRemoteKey, {
          remoteKey: row.imageRemoteKey,
          url: row.imageUrl,
          alt: row.title,
        });
      }
    }

    // 3. Batch insert toàn bộ quan hệ trong 1 Transaction
    await pgDB.transaction(async (tx) => {
      // A. Categories
      const insertedCategories = await batchCategorySeeding(tx, Array.from(uniqueCategoriesSet));
      const categoryIdMap = new Map<string, CategoryId>(insertedCategories.map((c) => [c.name, c.id as CategoryId]));

      // B. Users
      const usersToInsert = Array.from(uniqueUsersMap.values()).map((u) => ({
        ...u,
        password: hashedPassword,
      }));
      const insertedUsers = await batchUserSeeding(tx, usersToInsert);
      const userIdMap = new Map<string, UserId>(insertedUsers.map((u) => [u.email, u.id as UserId]));

      // C. Images
      const imagesToInsert = Array.from(uniqueImagesMap.values());
      const insertedImages = await batchImageSeeding(tx, imagesToInsert);
      const imageIdMap = new Map<string, ImageId>(insertedImages.map((img) => [img.remoteKey, img.id as ImageId]));

      // D. Posts
      const postsToInsert = parsedRows.map((row) => ({
        title: row.title,
        content: row.content,
        readingTime: row.readingTime,
        authorId: userIdMap.get(row.authorEmail)!,
        categoryId: categoryIdMap.get(row.category)!,
        thumbnailId: row.imageRemoteKey ? imageIdMap.get(row.imageRemoteKey) : undefined,
      }));

      await batchPostSeeding(tx, postsToInsert);
      logger.log(`Successfully seeded ${postsToInsert.length} posts with all relations!`);
    });
  } catch (error) {
    logger.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await pgPool.end();
    logger.log('Disconnect');
  }
})();

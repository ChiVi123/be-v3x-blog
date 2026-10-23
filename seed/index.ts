import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { categoriesSeed } from 'seed/categories.seed';
import { PostImagesSeed } from 'seed/post-images.seed';
import { postsSeed } from 'seed/posts.seed';
import { resetPgDatabase } from 'seed/utils';
import { relations } from '~infrastructure/database/drizzle/relations';
import * as schema from '~infrastructure/database/drizzle/schema';
import { seedAdmin } from './admin.seed';

const IS_CREATE_ADMIN = true;
const IS_RESET_DATABASE = true;
const IS_SEED_DATA = true;

(async () => {
  console.log('[Seed]: Start seeding ...');

  const pgPool = new Pool({ connectionString: process.env.DB_URL! });
  const pgDB = drizzle({ client: pgPool, relations });

  try {
    if (IS_RESET_DATABASE) {
      await resetPgDatabase(pgDB, schema);
      console.log('[Seed]: Database reset completed');
    }

    if (IS_CREATE_ADMIN) {
      await seedAdmin(pgDB);
    }

    if (IS_SEED_DATA) {
      await categoriesSeed(pgDB);
      await postsSeed(pgDB);
      await PostImagesSeed(pgDB);
    }
    console.log('[Seed]: Database seeded completed');
  } catch (error) {
    console.error('[Seed]: Database seed failed:', error);
    process.exitCode = 1;
  } finally {
    await pgPool.end();
    console.log('[Seed]: Database connection closed');
  }
})();

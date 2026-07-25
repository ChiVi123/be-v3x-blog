import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { Pool } from 'pg';
import { DRIZZLE_DB_TOKEN, PG_CLIENT_TOKEN } from '~infrastructure/config/provider-tokens';
import { relations } from './relations';
import { poolErrorListener } from './utils';

const logger = new Logger('DrizzleModule');

export const pgClientProvider: Provider = {
  provide: PG_CLIENT_TOKEN,
  useFactory: (configService: ConfigService) => {
    const url = configService.get<string>('DB_URL');
    const nodeEnv = configService.get<string>('NODE_ENV');

    if (nodeEnv === 'test') {
      console.log('Using PGlite for testing');
      return new PGlite();
    }

    if (!url) throw new Error('DB_URL is not defined');

    logger.log('DrizzleModule is being initialized');

    const pool = new Pool({
      connectionString: url,
    });

    poolErrorListener(pool);

    return pool;
  },
  inject: [ConfigService],
};

export const drizzleProvider: Provider = {
  provide: DRIZZLE_DB_TOKEN,
  useFactory: async (client: Pool | PGlite) => {
    if (client instanceof PGlite) {
      console.log('Using drizzleSqlite for testing');
      const db = drizzleSqlite({ client, relations, logger: true });
      const migrationsFolder = path.join(process.cwd(), 'drizzle');
      // Vấn đề: migratePglite hiểu sai cấu trúc của thư mục drizzle
      console.log('Running migrations from', migrationsFolder);
      await migratePglite(db, { migrationsFolder });
      console.log('Migrations completed');
      return db;
    }

    logger.log('DrizzleModule is being initialized');
    return drizzlePg({ client, relations, logger: true });
  },
  inject: [PG_CLIENT_TOKEN],
};

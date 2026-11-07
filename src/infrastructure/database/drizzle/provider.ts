import { existsSync } from 'node:fs';
import path from 'node:path';
import { Logger, type Provider } from '@nestjs/common';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { AppConfigService } from '~infrastructure/config/env';
import { DRIZZLE_DB_TOKEN, PG_CLIENT_TOKEN } from '~infrastructure/config/provider-tokens';
import { relations } from './relations';
import { poolErrorListener } from './utils';

const logger = new Logger('DrizzleModule');

export const pgClientProvider: Provider = {
  provide: PG_CLIENT_TOKEN,
  useFactory: (configService: AppConfigService) => {
    const url = configService.get('DB_URL');

    logger.log('PostgreSQL connection pool is being initialized');

    const pool = new Pool({
      connectionString: url,
    });

    poolErrorListener(pool);

    return pool;
  },
  inject: [AppConfigService],
};

export const drizzleProvider: Provider = {
  provide: DRIZZLE_DB_TOKEN,
  useFactory: async (client: Pool, configService: AppConfigService) => {
    logger.log('Drizzle ORM is being initialized');
    const db = drizzlePg({ client, relations, logger: true });

    const shouldMigrate = configService.get('AUTO_MIGRATE');
    if (shouldMigrate) {
      const configuredFolder = configService.get('MIGRATIONS_FOLDER');
      const migrationsFolder = configuredFolder
        ? path.resolve(process.cwd(), configuredFolder)
        : path.resolve(process.cwd(), 'drizzle');

      if (existsSync(migrationsFolder)) {
        try {
          logger.log(`Running database migrations from: ${migrationsFolder}`);
          await migrate(db, { migrationsFolder });
          logger.log('Database migrations completed successfully');
        } catch (error) {
          logger.error('Failed to run database migrations', error);
          throw error;
        }
      } else {
        logger.warn(`Migrations folder not found at: ${migrationsFolder}, skipping auto-migration`);
      }
    }

    return db;
  },
  inject: [PG_CLIENT_TOKEN, AppConfigService],
};

import { Logger, type Provider } from '@nestjs/common';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
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
  useFactory: async (client: Pool) => {
    logger.log('Drizzle ORM is being initialized');
    return drizzlePg({ client, relations, logger: true });
  },
  inject: [PG_CLIENT_TOKEN],
};

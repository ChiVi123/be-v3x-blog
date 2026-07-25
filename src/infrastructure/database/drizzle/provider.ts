import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE_DB_TOKEN, PG_CLIENT_TOKEN } from '~infrastructure/config/provider-tokens';
import { relations } from './relations';
import { poolErrorListener } from './utils';

const logger = new Logger('DrizzleModule');

export const pgClientProvider: Provider = {
  provide: PG_CLIENT_TOKEN,
  useFactory: (configService: ConfigService) => {
    const url = configService.get<string>('DB_URL');
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
  useFactory: async (client: Pool) => {
    logger.log('DrizzleModule is being initialized');
    return drizzlePg({ client, relations, logger: true });
  },
  inject: [PG_CLIENT_TOKEN],
};

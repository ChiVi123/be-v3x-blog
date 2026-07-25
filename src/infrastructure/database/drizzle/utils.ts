import { Logger } from '@nestjs/common';
import type { Pool } from 'pg';

const logger = new Logger('DrizzleModule');

export const poolErrorListener = (pool: Pool): void => {
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
};

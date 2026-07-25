import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_CLIENT_TOKEN } from '~infrastructure/config/provider-tokens';

@Injectable()
export class DrizzleService implements OnApplicationShutdown {
  private readonly logger = new Logger(DrizzleService.name);

  constructor(@Inject(PG_CLIENT_TOKEN) private readonly client: Pool) {}

  onApplicationShutdown(signal?: string): void {
    this.logger.log('onApplicationShutdown', signal);
    console.log('onApplicationShutdown', signal);

    this.client
      .end()
      .then(() => {
        this.logger.log('PostgreSQL connection closed');
        console.log('PostgreSQL connection closed');
      })
      .catch((error) => {
        this.logger.error('Error closing PostgreSQL connection', error);
        console.error('Error closing PostgreSQL connection', error);
      });
  }
}

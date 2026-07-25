import type { PGlite } from '@electric-sql/pglite';
import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_CLIENT_TOKEN } from '~infrastructure/config/provider-tokens';

@Injectable()
export class DrizzleService implements OnApplicationShutdown {
  private readonly logger = new Logger(DrizzleService.name);

  constructor(@Inject(PG_CLIENT_TOKEN) private readonly client: Pool | PGlite) {}

  onApplicationShutdown(signal?: string): void {
    this.logger.log('onApplicationShutdown', signal);
    console.log('onApplicationShutdown', signal);

    if (this.client instanceof Pool) {
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
      return;
    }

    this.client
      .close()
      .then(() => {
        this.logger.log('In-memory database connection closed');
        console.log('In-memory database connection closed');
      })
      .catch((error) => {
        this.logger.error('Error closing in-memory database connection', error);
        console.error('Error closing in-memory database connection', error);
      });
  }
}

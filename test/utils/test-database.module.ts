import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Global, Module } from '@nestjs/common';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { DRIZZLE_DB_TOKEN, PG_CLIENT_TOKEN } from '~infrastructure/config/provider-tokens';
import { relations } from '~infrastructure/database/drizzle/relations';

export const DB_CLEANUP_TOKEN = Symbol('TEST_DB_CLEANUP');

@Global()
@Module({
  providers: [
    {
      provide: PG_CLIENT_TOKEN,
      useFactory: () => new PGlite(),
    },
    {
      provide: DRIZZLE_DB_TOKEN,
      useFactory: async (client: PGlite) => {
        const db = drizzlePglite({ client, relations, logger: true });
        const migrationsFolder = path.join(process.cwd(), 'drizzle');
        await migratePglite(db, { migrationsFolder });
        return db;
      },
      inject: [PG_CLIENT_TOKEN],
    },
    {
      provide: DB_CLEANUP_TOKEN,
      useFactory: (client: PGlite) => ({
        close: () => client.close(),
      }),
      inject: [PG_CLIENT_TOKEN],
    },
  ],
  exports: [PG_CLIENT_TOKEN, DRIZZLE_DB_TOKEN, DB_CLEANUP_TOKEN],
})
export class TestDatabaseModule {}

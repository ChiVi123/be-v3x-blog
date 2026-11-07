import { existsSync } from 'node:fs';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { AppConfigModule } from '~infrastructure/config/config.module';
import { AppConfigService } from '~infrastructure/config/env';

const logger = new Logger('MigrationRunner');

async function runMigrations() {
  const appContext = await NestFactory.createApplicationContext(AppConfigModule, {
    logger: ['error', 'warn'],
  });
  const configService = appContext.get(AppConfigService);

  const dbUrl = configService.get('DB_URL');
  const configuredFolder = configService.get('MIGRATIONS_FOLDER');
  const migrationsFolder = configuredFolder
    ? path.resolve(process.cwd(), configuredFolder)
    : path.resolve(process.cwd(), 'drizzle');

  if (!existsSync(migrationsFolder)) {
    logger.error(`Migrations folder not found at: ${migrationsFolder}`);
    await appContext.close();
    process.exit(1);
  }

  logger.log('Connecting to database...');
  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle({ client: pool });

  try {
    logger.log(`Applying migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    logger.log('Migrations applied successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    await appContext.close();
  }
}

runMigrations();

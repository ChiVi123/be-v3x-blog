import { Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import slugify from 'slugify';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

export const logger = new Logger('Seeder');

export async function resetPgDatabase(db: DrizzleDB, schema: Record<string, unknown>): Promise<void> {
  const filteredSchema = Object.fromEntries(
    Object.entries(schema).filter(([, value]) => value instanceof PgTable),
  ) as Record<string, PgTable>;

  const tableToTruncates = Object.values(filteredSchema).map((table) => {
    const tableSchema = table[Symbol.for('drizzle:Schema')] ?? 'public';
    const tableName = table[Symbol.for('drizzle:Name')];
    return `"${tableSchema}"."${tableName}"`;
  });

  await db.execute(sql.raw(`truncate ${tableToTruncates.join(',')} cascade;`));
}

export function randomDate(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime();
  const end = endDate.getTime();

  if (start > end) {
    throw new Error('startDate must be before or equal to endDate');
  }

  return new Date(start + Math.random() * (end - start));
}

export function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createSlug(text: string): string {
  return slugify(text, {
    locale: 'vi',
    lower: true,
    strict: true,
    trim: true,
  });
}

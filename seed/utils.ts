import { sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

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

export function isDateBefore(date: Date, date2: Date): boolean {
  return date.getTime() < date2.getTime();
}

export function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomParagraph(minSentences = 3, maxSentences = 7): string {
  const sentences = [
    'The quick brown fox jumps over the lazy dog.',
    'Modern web applications require scalable architecture.',
    'TypeScript helps developers write safer and more maintainable code.',
    'Database optimization improves application performance.',
    'Developers often use reusable components to simplify development.',
    'Good software design makes applications easier to maintain.',
    'Caching can reduce response times and database load.',
    'Testing helps prevent unexpected bugs in production.',
    'Clean code improves collaboration between team members.',
    'Efficient algorithms can significantly reduce execution time.',
  ];

  const count = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;

  return Array.from({ length: count }, () => sentences[Math.floor(Math.random() * sentences.length)]).join('\n');
}

import bcrypt from 'bcrypt';
import { Role } from '~domain/entities/user.entity';
import { users } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

export const ADMIN_EMAIL = 'admin@v3x.dev';

export async function seedAdmin(db: DrizzleDB): Promise<void> {
  try {
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash('admin123', salt);
    await db.insert(users).values({
      username: 'admin',
      email: ADMIN_EMAIL,
      password,
      role: Role.ADMIN,
    });
    console.log('[Seed]: Admin seed completed');
  } catch (error) {
    console.error('[Seed]: Admin seed failed:', error);
  }
}

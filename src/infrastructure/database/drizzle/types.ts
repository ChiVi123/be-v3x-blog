import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { relations } from './relations';
import type { comments, images, posts, sessions, users } from './schema';

export type DrizzleDB = NodePgDatabase<typeof relations>;

export type ImageInput = typeof images.$inferInsert;
export type ImageSelect = typeof images.$inferSelect;

export type UserInput = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;

export type DrizzleSessionInput = typeof sessions.$inferInsert;
export type DrizzleSessionSelect = typeof sessions.$inferSelect;

export type PostInput = typeof posts.$inferInsert;
export type PostSelect = typeof posts.$inferSelect;

export type CommentInput = typeof comments.$inferInsert;
export type CommentSelect = typeof comments.$inferSelect;

export type { userRoleEnum as UserRole } from './schema';

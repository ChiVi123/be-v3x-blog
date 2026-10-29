import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import type { ImageMetadata } from '~domain/entities/image.entity';
import { Role } from '~domain/entities/user.entity';
import type { CategoryId, CommentId, ImageId, PostId, SessionId, UserId } from '~domain/types/branded';

export const userRoleEnum = pgEnum('user_role', [Role.ADMIN, Role.USER]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
};

// ==========================================
// 2. IMAGES TABLE
// ==========================================
export const images = pgTable('images', {
  id: uuid('id').defaultRandom().primaryKey().$type<ImageId>(),
  remoteKey: varchar('remote_key', { length: 255 }).notNull().unique(),
  url: text('url').notNull(),
  alt: varchar('alt', { length: 255 }).notNull(),
  metadata: jsonb('metadata').notNull().$type<ImageMetadata>(),
  ...timestamps,
});

// ==========================================
// 3. USERS TABLE
// ==========================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey().$type<UserId>(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').default(Role.USER).notNull(),
  bio: varchar('bio', { length: 500 }),
  avatarId: uuid('avatar_id')
    .references(() => images.id, { onDelete: 'set null' })
    .$type<ImageId>(),
  ...timestamps,
});

// ==========================================
// 4. SESSIONS TABLE
// ==========================================
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey().$type<SessionId>(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .$type<UserId>(),
    refreshToken: text('refresh_token').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: text('user_agent').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_refresh_token_idx').on(table.refreshToken),
  ],
);

// ==========================================
// 5. POSTS TABLE
// ==========================================
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey().$type<PostId>(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    content: text('content').notNull(),
    readingTime: integer('reading_time').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' })
      .$type<CategoryId>(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .$type<UserId>(),
    thumbnailId: uuid('thumbnail_id')
      .references(() => images.id, { onDelete: 'set null' })
      .$type<ImageId>(),
    ...timestamps,
  },
  (table) => [
    index('posts_slug_idx').on(table.slug),
    index('posts_category_idx').on(table.categoryId),
    index('posts_author_id_idx').on(table.authorId),
  ],
);

// ==========================================
// 6. COMMENTS TABLE
// ==========================================
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').defaultRandom().primaryKey().$type<CommentId>(),
    content: text('content').notNull(),
    likes: uuid('likes').array().default(sql`'{}'::uuid[]`).notNull().$type<UserId>(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' })
      .$type<PostId>(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .$type<UserId>(),
    ...timestamps,
  },
  (table) => [index('comments_post_id_idx').on(table.postId), index('comments_author_id_idx').on(table.authorId)],
);

// ==========================================
// 7. CATEGORIES TABLE
// ==========================================
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey().$type<CategoryId>(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    ...timestamps,
  },
  (table) => [index('categories_name_idx').on(table.name), index('categories_slug_idx').on(table.slug)],
);

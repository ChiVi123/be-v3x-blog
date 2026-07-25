import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  // ==========================================
  // 1. IMAGES TABLE RELATIONS
  // ==========================================
  images: {
    user: r.one.users(),
    posts: r.many.posts(),
  },

  // ==========================================
  // 2. USERS TABLE RELATIONS
  // ==========================================
  users: {
    avatar: r.one.images({
      from: r.users.avatarId,
      to: r.images.id,
    }),
    posts: r.many.posts(),
    comments: r.many.comments(),
    sessions: r.many.sessions(),
  },

  // ==========================================
  // 3. SESSIONS TABLE RELATIONS
  // ==========================================
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },

  // ==========================================
  // 4. POSTS TABLE RELATIONS
  // ==========================================
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
    thumbnail: r.one.images({
      from: r.posts.thumbnailId,
      to: r.images.id,
    }),
    comments: r.many.comments(),
  },

  // ==========================================
  // 5. COMMENTS TABLE RELATIONS
  // ==========================================
  comments: {
    post: r.one.posts({
      from: r.comments.postId,
      to: r.posts.id,
    }),
    author: r.one.users({
      from: r.comments.authorId,
      to: r.users.id,
    }),
  },
}));

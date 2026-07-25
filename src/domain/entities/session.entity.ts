import type { SessionId, UserId } from '~domain/types/branded';

export interface SessionEntity {
  id: SessionId;
  userId: UserId;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionInput = Omit<SessionEntity, 'id' | 'createdAt' | 'updatedAt'>;

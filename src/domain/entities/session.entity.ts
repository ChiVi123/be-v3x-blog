import type { BaseEntity } from '~domain/entities/base.entity';
import type { SessionId, UserId } from '~domain/types/branded';

export interface SessionEntity extends BaseEntity<SessionId> {
  userId: UserId;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
}

export type SessionInput = Omit<SessionEntity, 'id' | 'createdAt' | 'updatedAt'>;

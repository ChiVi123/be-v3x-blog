import type { SessionEntity } from '~domain/entities/session.entity';
import type { SessionId } from '~domain/types/branded';

export interface SessionRepository {
  create(input: SessionCreateInput): Promise<SessionEntity['refreshToken']>;
  delete(sessionId: SessionId): Promise<void>;
  deleteByRefreshToken(refreshToken: SessionEntity['refreshToken']): Promise<void>;
  findById(sessionId: SessionId): Promise<SessionEntity | null>;
  findValidByRefreshToken(refreshToken: SessionEntity['refreshToken']): Promise<SessionFound | null>;
  rotateRefreshToken(input: SessionRotationInput): Promise<boolean>;
}

export type SessionCreateInput = Pick<
  SessionEntity,
  'userId' | 'ipAddress' | 'userAgent' | 'refreshToken' | 'expiresAt'
>;

export type SessionFound = Required<Pick<SessionEntity, 'id' | 'refreshToken' | 'userId' | 'expiresAt'>>;

export type SessionRotationInput = {
  sessionId: SessionId;
  currentRefreshToken: SessionEntity['refreshToken'];
  newRefreshToken: SessionEntity['refreshToken'];
  ipAddress: SessionEntity['ipAddress'];
  userAgent: SessionEntity['userAgent'];
  expiresAt: SessionEntity['expiresAt'];
};

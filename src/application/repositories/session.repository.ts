import type { SessionEntity } from '~domain/entities/session.entity';
import type { SessionId } from '~domain/types/branded';

export interface SessionRepository {
  // TODO: Return SessionEntity
  create(input: SessionCreateInput): Promise<string>;
  delete(sessionId: SessionId): Promise<void>;
  findById(sessionId: SessionId): Promise<SessionEntity | null>;
  findValidByRefreshToken(refreshToken: string): Promise<string | null>;
}

export type SessionCreateInput = Pick<
  SessionEntity,
  'userId' | 'ipAddress' | 'userAgent' | 'refreshToken' | 'expiresAt'
>;

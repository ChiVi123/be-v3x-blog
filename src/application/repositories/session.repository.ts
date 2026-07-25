import type { SessionEntity } from '~domain/entities/session.entity';
import type { SessionId, UserId } from '~domain/types/branded';

export interface SessionRepository {
  create(userId: UserId): Promise<SessionEntity>;
  delete(sessionId: SessionId): Promise<void>;
  findById(sessionId: SessionId): Promise<SessionEntity | null>;
}

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import type { SessionCreateInput, SessionFound, SessionRepository } from '~application/repositories/session.repository';
import type { SessionEntity } from '~domain/entities/session.entity';
import type { SessionId, UserId } from '~domain/types/branded';
import { DRIZZLE_DB_TOKEN } from '~infrastructure/config/provider-tokens';
import { sessions } from '~infrastructure/database/drizzle/schema';
import type { DrizzleDB } from '~infrastructure/database/drizzle/types';

const INCLUDE_TOKEN_ONLY = {
  refreshToken: sessions.refreshToken,
};

const SESSION_FOUND_SELECTION = {
  id: sessions.id,
  userId: sessions.userId,
  refreshToken: sessions.refreshToken,
  expiresAt: sessions.expiresAt,
};

@Injectable()
export class DrizzleSessionRepository implements SessionRepository {
  constructor(@Inject(DRIZZLE_DB_TOKEN) private readonly db: DrizzleDB) {}

  async create(input: SessionCreateInput): Promise<string> {
    const [sessionEntity] = await this.db.insert(sessions).values(input).returning(INCLUDE_TOKEN_ONLY);
    if (!sessionEntity) {
      throw new Error('Failed to create session');
    }
    return sessionEntity.refreshToken;
  }

  async delete(sessionId: SessionId): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  // TODO: Include user relation
  async findById(sessionId: SessionId): Promise<SessionEntity | null> {
    const [sessionEntity] = await this.db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);

    if (!sessionEntity) {
      return null;
    }
    return {
      id: sessionEntity.id as SessionId,
      userId: sessionEntity.userId as UserId,
      refreshToken: sessionEntity.refreshToken,
      ipAddress: sessionEntity.ipAddress,
      userAgent: sessionEntity.userAgent,
      expiresAt: sessionEntity.expiresAt,
      createdAt: sessionEntity.createdAt,
      updatedAt: sessionEntity.updatedAt,
    };
  }

  async findValidByRefreshToken(refreshToken: string): Promise<SessionFound | null> {
    const [sessionEntity] = await this.db
      .select(SESSION_FOUND_SELECTION)
      .from(sessions)
      .where(and(eq(sessions.refreshToken, refreshToken), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!sessionEntity) {
      return null;
    }
    return {
      id: sessionEntity.id as SessionId,
      userId: sessionEntity.userId as UserId,
      refreshToken: sessionEntity.refreshToken,
      expiresAt: sessionEntity.expiresAt,
    };
  }
}

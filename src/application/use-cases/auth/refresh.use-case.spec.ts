import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SessionFound, SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import type { ClientContext } from '~application/types/use-case.type';
import { RefreshUseCase } from '~application/use-cases/auth/refresh.use-case';
import { Role, type UserEntity } from '~domain/entities/user.entity';
import { UnauthorizedException } from '~domain/exceptions';
import type { SessionId, UserId } from '~domain/types/branded';

describe('RefreshUseCase', () => {
  let useCase: RefreshUseCase;
  let mockSessionRepository: {
    findValidByRefreshToken: ReturnType<typeof mock>;
    rotateRefreshToken: ReturnType<typeof mock>;
  };
  let mockUserRepository: {
    findById: ReturnType<typeof mock>;
  };
  let mockAuthService: {
    createRefreshTokenExpiryDate: ReturnType<typeof mock>;
    generateAccessToken: ReturnType<typeof mock>;
    generateRefreshToken: ReturnType<typeof mock>;
  };

  const refreshTokenExpiryDate = new Date('2026-10-03T00:00:00Z');
  const clientContext: ClientContext = {
    ipAddress: '127.0.0.1',
    userAgent: 'TestBrowser/1.0',
  };
  const session: SessionFound = {
    id: 'session-id' as SessionId,
    userId: 'user-id' as UserId,
    refreshToken: 'old-refresh-token',
    expiresAt: new Date('2026-09-27T00:00:00Z'),
  };
  const user: UserEntity = {
    id: 'user-id' as UserId,
    username: 'john_doe',
    email: 'john@example.com',
    password: 'hashed-password',
    role: Role.USER,
    avatarId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockSessionRepository = {
      findValidByRefreshToken: mock(async () => session),
      rotateRefreshToken: mock(async () => true),
    };
    mockUserRepository = {
      findById: mock(async () => user),
    };
    mockAuthService = {
      generateRefreshToken: mock(() => 'new-refresh-token'),
      createRefreshTokenExpiryDate: mock(() => refreshTokenExpiryDate),
      generateAccessToken: mock(() => 'new-access-token'),
    };

    useCase = new RefreshUseCase(
      mockSessionRepository as unknown as SessionRepository,
      mockAuthService as unknown as AuthService,
      mockUserRepository as unknown as UserRepository,
    );
  });

  it('rejects a refresh token that has no valid session', async () => {
    mockSessionRepository.findValidByRefreshToken = mock(async () => null);

    await expect(useCase.execute({ refreshToken: 'invalid-token', clientContext })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
    expect(mockSessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects a session whose user no longer exists', async () => {
    mockUserRepository.findById = mock(async () => null);

    await expect(useCase.execute({ refreshToken: session.refreshToken, clientContext })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockSessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('rotates the valid token with a conditional repository operation', async () => {
    const result = await useCase.execute({ refreshToken: session.refreshToken, clientContext });

    expect(mockSessionRepository.rotateRefreshToken).toHaveBeenCalledWith({
      sessionId: 'session-id' as SessionId,
      currentRefreshToken: 'old-refresh-token',
      newRefreshToken: 'new-refresh-token',
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser/1.0',
      expiresAt: refreshTokenExpiryDate,
    });
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      refreshTokenExpiryDate,
    });
  });

  it('rejects a refresh token when another request rotates it first', async () => {
    let rotations = 0;
    mockSessionRepository.rotateRefreshToken = mock(async () => {
      rotations += 1;
      return rotations === 1;
    });

    const results = await Promise.allSettled([
      useCase.execute({ refreshToken: session.refreshToken, clientContext }),
      useCase.execute({ refreshToken: session.refreshToken, clientContext }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(mockSessionRepository.rotateRefreshToken).toHaveBeenCalledTimes(2);
  });
});

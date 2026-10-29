import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SessionFound, SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import type { ClientContext } from '~application/types/use-case.type';
import { Role, type UserEntity } from '~domain/entities/user.entity';
import { InvalidCredentialsException, UnauthorizedException, UserAlreadyExistsException } from '~domain/exceptions';
import type { SessionId, UserId } from '~domain/types/branded';
import { AuthFacade } from './auth.facade';

describe('AuthFacade', () => {
  let facade: AuthFacade;
  let mockUserRepository: {
    create: ReturnType<typeof mock>;
    findById: ReturnType<typeof mock>;
    findByEmail: ReturnType<typeof mock>;
    isExistByEmail: ReturnType<typeof mock>;
  };
  let mockSessionRepository: {
    create: ReturnType<typeof mock>;
    deleteByRefreshToken: ReturnType<typeof mock>;
    findValidByRefreshToken: ReturnType<typeof mock>;
    rotateRefreshToken: ReturnType<typeof mock>;
  };
  let mockAuthService: {
    hashPassword: ReturnType<typeof mock>;
    verifyPassword: ReturnType<typeof mock>;
    generateAccessToken: ReturnType<typeof mock>;
    generateRefreshToken: ReturnType<typeof mock>;
    createRefreshTokenExpiryDate: ReturnType<typeof mock>;
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
    bio: 'john-bio',
    role: Role.USER,
    avatarId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockUserRepository = {
      create: mock(async (input: unknown) => ({
        id: 'new-user-id' as UserId,
        ...(input as object),
      })),
      findById: mock(async () => user),
      findByEmail: mock(async () => user),
      isExistByEmail: mock(async () => false),
    };

    mockSessionRepository = {
      create: mock(async () => 'session-refresh-token'),
      deleteByRefreshToken: mock(async () => undefined),
      findValidByRefreshToken: mock(async () => session),
      rotateRefreshToken: mock(async () => true),
    };

    mockAuthService = {
      hashPassword: mock(async () => 'hashed-password'),
      verifyPassword: mock(async () => true),
      generateAccessToken: mock(() => 'access-token'),
      generateRefreshToken: mock(() => 'new-refresh-token'),
      createRefreshTokenExpiryDate: mock(() => refreshTokenExpiryDate),
    };

    facade = new AuthFacade(
      mockUserRepository as unknown as UserRepository,
      mockSessionRepository as unknown as SessionRepository,
      mockAuthService as unknown as AuthService,
    );
  });

  describe('login', () => {
    it('authenticates user and returns tokens', async () => {
      const result = await facade.login({
        email: 'john@example.com',
        password: 'password123',
        clientContext,
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('john@example.com', true);
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(mockSessionRepository.create).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'session-refresh-token',
        refreshTokenExpiryDate,
      });
    });

    it('throws InvalidCredentialsException when email not found', async () => {
      mockUserRepository.findByEmail = mock(async () => null);

      expect(
        facade.login({
          email: 'notfound@example.com',
          password: 'password123',
          clientContext,
        }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('throws InvalidCredentialsException when password does not match', async () => {
      mockAuthService.verifyPassword = mock(async () => false);

      expect(
        facade.login({
          email: 'john@example.com',
          password: 'wrongpassword',
          clientContext,
        }),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('register', () => {
    it('creates new user when email does not exist', async () => {
      const result = await facade.register({
        email: 'new@example.com',
        password: 'secretpassword',
        username: 'newuser',
      });

      expect(mockUserRepository.isExistByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('secretpassword');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'hashed-password',
        username: 'newuser',
        role: Role.USER,
        avatarId: null,
        bio: null,
      });
      expect(result).toEqual({
        id: 'new-user-id' as UserId,
        email: 'new@example.com',
        username: 'newuser',
      });
    });

    it('throws UserAlreadyExistsException when email exists', async () => {
      mockUserRepository.isExistByEmail = mock(async () => true);

      expect(
        facade.register({
          email: 'existing@example.com',
          password: 'password',
          username: 'user',
        }),
      ).rejects.toThrow(UserAlreadyExistsException);
    });
  });

  describe('refresh', () => {
    it('rejects a refresh token that has no valid session', async () => {
      mockSessionRepository.findValidByRefreshToken = mock(async () => null);

      await expect(facade.refresh({ refreshToken: 'invalid-token', clientContext })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockSessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a session whose user no longer exists', async () => {
      mockUserRepository.findById = mock(async () => null);

      await expect(facade.refresh({ refreshToken: session.refreshToken, clientContext })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('rotates the valid token with a conditional repository operation', async () => {
      const result = await facade.refresh({ refreshToken: session.refreshToken, clientContext });

      expect(mockSessionRepository.rotateRefreshToken).toHaveBeenCalledWith({
        sessionId: 'session-id' as SessionId,
        currentRefreshToken: 'old-refresh-token',
        newRefreshToken: 'new-refresh-token',
        ipAddress: '127.0.0.1',
        userAgent: 'TestBrowser/1.0',
        expiresAt: refreshTokenExpiryDate,
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
        refreshTokenExpiryDate,
      });
    });
  });

  describe('logout', () => {
    it('deletes session by refresh token', async () => {
      await facade.logout('some-refresh-token');
      expect(mockSessionRepository.deleteByRefreshToken).toHaveBeenCalledWith('some-refresh-token');
    });
  });

  describe('getMe', () => {
    it('returns user details without password when user exists', async () => {
      const result = await facade.getMe('user-id' as UserId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id' as UserId);
      expect(result).toEqual({
        id: 'user-id' as UserId,
        username: 'john_doe',
        email: 'john@example.com',
        role: Role.USER,
        avatarId: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect((result as Record<string, unknown>).password).toBeUndefined();
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockUserRepository.findById = mock(async () => null);

      expect(facade.getMe('non-existent' as UserId)).rejects.toThrow(UnauthorizedException);
    });
  });
});

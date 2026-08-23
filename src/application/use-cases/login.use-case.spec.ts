import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import {
  LoginUseCase,
  type LoginUseCaseParams,
} from '~application/use-cases/login.use-case';
import { Role, type UserEntity } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepository: UserRepository;
  let mockSessionRepository: SessionRepository;
  let mockAuthService: AuthService;

  const mockUser: UserEntity = {
    id: 'user-uuid-1' as UserId,
    username: 'john_doe',
    email: 'john@example.com',
    password: 'hashed_password_123',
    role: Role.USER,
    avatarId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const loginParams: LoginUseCaseParams = {
    email: 'john@example.com',
    password: 'plain_password',
    clientContext: {
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser/1.0',
    },
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: mock(async () => mockUser),
      create: mock(),
      update: mock(),
      delete: mock(),
      findById: mock(),
    };

    mockSessionRepository = {
      create: mock(async () => 'mock-refresh-token-from-db'),
      delete: mock(),
      findById: mock(),
      findValidByRefreshToken: mock(),
    };

    mockAuthService = {
      hashPassword: mock(),
      verifyPassword: mock(async () => true),
      generateAccessToken: mock(() => 'mock-access-token'),
      generateRefreshToken: mock(() => 'mock-generated-refresh-token'),
      createRefreshTokenExpiryDate: mock(() => new Date('2026-09-01T00:00:00Z')),
    };

    useCase = new LoginUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockAuthService,
    );
  });

  it('should throw an error when user is not found by email', async () => {
    mockUserRepository.findByEmail = mock(async () => null);

    expect(useCase.execute(loginParams)).rejects.toThrow(
      'Invalid email or password',
    );
    expect(mockAuthService.verifyPassword).not.toHaveBeenCalled();
    expect(mockSessionRepository.create).not.toHaveBeenCalled();
  });

  it('should throw an error when password verification fails', async () => {
    mockAuthService.verifyPassword = mock(async () => false);

    expect(useCase.execute(loginParams)).rejects.toThrow(
      'Invalid email or password',
    );
    expect(mockSessionRepository.create).not.toHaveBeenCalled();
  });

  it('should successfully authenticate user and return tokens', async () => {
    const expiryDate = new Date('2026-09-01T00:00:00Z');
    mockAuthService.createRefreshTokenExpiryDate = mock(() => expiryDate);
    mockAuthService.generateRefreshToken = mock(() => 'custom-refresh-token');
    mockAuthService.generateAccessToken = mock(() => 'custom-access-token');
    mockSessionRepository.create = mock(async () => 'session-token-123');

    const result = await useCase.execute(loginParams);

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
    expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
      'plain_password',
      'hashed_password_123',
    );
    expect(mockSessionRepository.create).toHaveBeenCalledWith({
      userId: 'user-uuid-1' as UserId,
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser/1.0',
      refreshToken: 'custom-refresh-token',
      expiresAt: expiryDate,
    });
    expect(mockAuthService.generateAccessToken).toHaveBeenCalledWith({
      id: 'user-uuid-1' as UserId,
      email: 'john@example.com',
      role: Role.USER,
    });
    expect(result).toEqual({
      accessToken: 'custom-access-token',
      refreshToken: 'session-token-123',
    });
  });
});

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserOutput, UserRepository } from '~application/repositories/user.repository';
import type { AccessTokenPayload } from '~application/services/auth.service';
import { Role, UserStatus } from '~domain/entities/user.entity';
import { ForbiddenException, UnauthorizedException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let mockUserRepository: { findById: ReturnType<typeof mock> };

  const tokenPayload: AccessTokenPayload = {
    id: 'admin-1' as UserId,
    email: 'admin@example.com',
    role: Role.ADMIN,
  };
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const makeUser = (overrides: Partial<UserOutput> = {}): UserOutput => ({
    id: 'admin-1' as UserId,
    username: 'admin',
    email: 'admin@example.com',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    bio: null,
    avatarId: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  });

  const createContext = (user?: AccessTokenPayload): ExecutionContext => {
    const request = { user } as unknown as Request;
    return {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({}) }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockUserRepository = { findById: mock(async () => makeUser()) };
    guard = new AdminGuard(mockUserRepository as unknown as UserRepository);
  });

  it('throws UnauthorizedException when there is no user on the request', async () => {
    await expect(guard.canActivate(createContext())).rejects.toThrow(UnauthorizedException);
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the user no longer exists', async () => {
    mockUserRepository.findById = mock(async () => null);

    await expect(guard.canActivate(createContext(tokenPayload))).rejects.toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when the admin is banned, even with a valid token', async () => {
    mockUserRepository.findById = mock(async () => makeUser({ status: UserStatus.BANNED }));

    await expect(guard.canActivate(createContext(tokenPayload))).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the token says admin but the database says user', async () => {
    mockUserRepository.findById = mock(async () => makeUser({ role: Role.USER }));

    await expect(guard.canActivate(createContext(tokenPayload))).rejects.toThrow(ForbiddenException);
  });

  it('allows an active admin', async () => {
    expect(await guard.canActivate(createContext(tokenPayload))).toBe(true);
    expect(mockUserRepository.findById).toHaveBeenCalledWith('admin-1' as UserId);
  });
});

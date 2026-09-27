import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload, AuthService } from '~application/services/auth.service';
import { Role } from '~domain/entities/user.entity';
import { UnauthorizedException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockAuthService: { verifyAccessToken: ReturnType<typeof mock> };

  const mockPayload: AccessTokenPayload = {
    id: 'user-1' as UserId,
    email: 'test@example.com',
    role: Role.USER,
  };

  const createMockContext = (headers: Record<string, string | undefined>): ExecutionContext => {
    const request = {
      headers,
    } as unknown as Request;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockAuthService = {
      verifyAccessToken: mock(async () => mockPayload),
    };
    guard = new JwtAuthGuard(mockAuthService as unknown as AuthService);
  });

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    const context = createMockContext({});

    expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when scheme is not Bearer', async () => {
    const context = createMockContext({ authorization: 'Basic dXNlcjpwYXNz' });

    expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when token is missing after Bearer', async () => {
    const context = createMockContext({ authorization: 'Bearer' });

    expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when authService rejects the token', async () => {
    mockAuthService.verifyAccessToken = mock(async () => {
      throw new Error('jwt expired');
    });

    const context = createMockContext({ authorization: 'Bearer invalid.token.here' });

    expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('attaches user payload to request and returns true when token is valid', async () => {
    const request = {
      headers: { authorization: 'Bearer valid.jwt.token' },
    } as Request;

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid.jwt.token');
    expect(request.user).toEqual(mockPayload);
  });
});

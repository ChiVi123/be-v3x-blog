import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AccessTokenPayload } from '~application/services/auth.service';
import { Role } from '~domain/entities/user.entity';
import { ForbiddenException, UnauthorizedException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { ROLES_KEY } from '~presentation/decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: { getAllAndOverride: ReturnType<typeof mock> };

  const handler = () => undefined;
  class TestController {}

  const createUser = (role: Role): AccessTokenPayload => ({
    id: 'user-1' as UserId,
    email: 'test@example.com',
    role,
  });

  const createContext = (user?: AccessTokenPayload): ExecutionContext => {
    const request = { user } as unknown as Request;

    return {
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  const setRequiredRoles = (roles: Role[] | undefined) => {
    mockReflector.getAllAndOverride.mockReturnValue(roles);
  };

  beforeEach(() => {
    mockReflector = { getAllAndOverride: mock(() => undefined) };
    guard = new RolesGuard(mockReflector as unknown as Reflector);
  });

  it('reads the roles metadata from the handler and the class', () => {
    setRequiredRoles([Role.ADMIN]);

    guard.canActivate(createContext(createUser(Role.ADMIN)));

    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handler, TestController]);
  });

  it('allows the request when the route has no @Roles() metadata', () => {
    setRequiredRoles(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows the request when the required roles list is empty', () => {
    setRequiredRoles([]);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('throws UnauthorizedException when roles are required but there is no user', () => {
    setRequiredRoles([Role.ADMIN]);

    expect(() => guard.canActivate(createContext())).toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when the user role is not allowed', () => {
    setRequiredRoles([Role.ADMIN]);

    expect(() => guard.canActivate(createContext(createUser(Role.USER)))).toThrow(ForbiddenException);
  });

  it('allows the request when the user role is allowed', () => {
    setRequiredRoles([Role.ADMIN]);

    expect(guard.canActivate(createContext(createUser(Role.ADMIN)))).toBe(true);
  });

  it('allows the request when the user role matches one of several allowed roles', () => {
    setRequiredRoles([Role.ADMIN, Role.USER]);

    expect(guard.canActivate(createContext(createUser(Role.USER)))).toBe(true);
  });
});

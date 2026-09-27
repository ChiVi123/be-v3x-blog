import { describe, expect, it } from 'bun:test';
import type { Request } from 'express';
import type { AccessTokenPayload } from '~application/services/auth.service';
import { Role } from '~domain/entities/user.entity';
import type { UserId } from '~domain/types/branded';
import { extractCurrentUser } from './current-user.decorator';

describe('extractCurrentUser', () => {
  const mockUser: AccessTokenPayload = {
    id: 'user-1' as UserId,
    email: 'test@example.com',
    role: Role.USER,
  };

  it('should return undefined when req.user is undefined', () => {
    const req = {} as Request;
    expect(extractCurrentUser(req)).toBeUndefined();
    expect(extractCurrentUser(req, 'id')).toBeUndefined();
  });

  it('should return entire user object when data key is not provided', () => {
    const req = { user: mockUser } as Request;
    expect(extractCurrentUser(req)).toEqual(mockUser);
  });

  it('should return specific field when key is provided', () => {
    const req = { user: mockUser } as Request;
    expect(extractCurrentUser(req, 'id')).toBe('user-1' as UserId);
    expect(extractCurrentUser(req, 'email')).toBe('test@example.com');
    expect(extractCurrentUser(req, 'role')).toBe(Role.USER);
  });
});

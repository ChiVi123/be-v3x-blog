import 'reflect-metadata';

import { describe, expect, it } from 'bun:test';
import { validate } from 'class-validator';
import { Role } from '~domain/entities/user.entity';
import { RegisterRequest } from './register.dto';

// Helper: build a RegisterRequest instance from plain object
function buildDto(data: Partial<RegisterRequest>): RegisterRequest {
  return Object.assign(new RegisterRequest(), data);
}

// Helper: collect constraint keys for a specific property
async function getErrors(dto: RegisterRequest, property: keyof RegisterRequest) {
  const errors = await validate(dto);
  const field = errors.find((e) => e.property === property);
  return Object.keys(field?.constraints ?? {});
}

// ---------------------------------------------------------------------------

describe('RegisterRequest - username', () => {
  it('passes with a valid username string', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'username')).toBe(false);
  });

  it('fails when username is missing', async () => {
    const dto = buildDto({
      email: 'john@example.com',
      password: 'password123',
    });
    const constraints = await getErrors(dto, 'username');
    expect(constraints).toContain('isNotEmpty');
  });

  it('fails when username is an empty string', async () => {
    const dto = buildDto({
      username: '',
      email: 'john@example.com',
      password: 'password123',
    });
    const constraints = await getErrors(dto, 'username');
    expect(constraints).toContain('isNotEmpty');
  });

  it('fails when username is not a string (number)', async () => {
    const dto = buildDto({
      username: 12345 as unknown as string,
      email: 'john@example.com',
      password: 'password123',
    });
    const constraints = await getErrors(dto, 'username');
    expect(constraints).toContain('isString');
  });
});

// ---------------------------------------------------------------------------

describe('RegisterRequest - role', () => {
  it('passes when role is omitted (optional)', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(false);
  });

  it('passes when role is Role.USER', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123',
      role: Role.USER,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(false);
  });

  it('passes when role is Role.ADMIN', async () => {
    const dto = buildDto({
      username: 'admin_user',
      email: 'admin@example.com',
      password: 'password123',
      role: Role.ADMIN,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(false);
  });

  it('fails when role is an invalid string', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'superadmin' as unknown as Role,
    });
    const constraints = await getErrors(dto, 'role');
    expect(constraints).toContain('isEnum');
  });

  it('fails when role is a number', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123',
      role: 999 as unknown as Role,
    });
    const constraints = await getErrors(dto, 'role');
    expect(constraints).toContain('isEnum');
  });
});

// ---------------------------------------------------------------------------

describe('RegisterRequest - inherited fields (LoginRequest)', () => {
  it('fails when email is invalid', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'invalid-email',
      password: 'password123',
    });
    const constraints = await getErrors(dto, 'email');
    expect(constraints).toContain('isEmail');
  });

  it('fails when password is too short (< 6 chars)', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: '123',
    });
    const constraints = await getErrors(dto, 'password');
    expect(constraints).toContain('minLength');
  });

  it('fails when password is too long (> 255 chars)', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'a'.repeat(256),
    });
    const constraints = await getErrors(dto, 'password');
    expect(constraints).toContain('maxLength');
  });
});

// ---------------------------------------------------------------------------

describe('RegisterRequest - full DTO', () => {
  it('returns no errors for a valid payload without role', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('returns no errors for a valid payload with role', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123',
      role: Role.USER,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('reports errors for all invalid fields when multiple fields fail', async () => {
    const dto = buildDto({
      username: '',
      email: 'not-an-email',
      password: '123',
      role: 'invalid_role' as unknown as Role,
    });
    const errors = await validate(dto);
    const props = errors.map((e) => e.property);
    expect(props).toContain('username');
    expect(props).toContain('email');
    expect(props).toContain('password');
    expect(props).toContain('role');
  });
});

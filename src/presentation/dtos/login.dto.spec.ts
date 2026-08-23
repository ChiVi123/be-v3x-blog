import 'reflect-metadata';

import { describe, expect, it } from 'bun:test';
import { validate } from 'class-validator';
import { LoginRequest } from './login.dto';

// Helper: build a LoginRequest instance from plain object
function buildDto(data: Partial<{ email: string; password: string }>): LoginRequest {
  return Object.assign(new LoginRequest(), data);
}

// Helper: collect constraint keys for a specific property
async function getErrors(dto: LoginRequest, property: keyof LoginRequest) {
  const errors = await validate(dto);
  const field = errors.find((e) => e.property === property);
  return Object.keys(field?.constraints ?? {});
}

// ---------------------------------------------------------------------------

describe('LoginRequest - email', () => {
  it('passes with a valid email', async () => {
    const dto = buildDto({ email: 'user@example.com', password: 'secret123' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(false);
  });

  it('fails when email is missing', async () => {
    const dto = buildDto({ password: 'secret123' });
    const constraints = await getErrors(dto, 'email');
    expect(constraints).toContain('isEmail');
  });

  it('fails when email is an empty string', async () => {
    const dto = buildDto({ email: '', password: 'secret123' });
    const constraints = await getErrors(dto, 'email');
    expect(constraints).toContain('isEmail');
  });

  it('fails when email has no "@" sign', async () => {
    const dto = buildDto({ email: 'notanemail', password: 'secret123' });
    const constraints = await getErrors(dto, 'email');
    expect(constraints).toContain('isEmail');
  });

  it('fails when email has no domain part', async () => {
    const dto = buildDto({ email: 'user@', password: 'secret123' });
    const constraints = await getErrors(dto, 'email');
    expect(constraints).toContain('isEmail');
  });

  it('fails when email has no local part', async () => {
    const dto = buildDto({ email: '@example.com', password: 'secret123' });
    const constraints = await getErrors(dto, 'email');
    expect(constraints).toContain('isEmail');
  });

  it('fails when email is a plain number', async () => {
    const dto = buildDto({ email: 12345 as unknown as string, password: 'secret123' });
    const constraints = await getErrors(dto, 'email');
    expect(constraints).toContain('isEmail');
  });
});

// ---------------------------------------------------------------------------

describe('LoginRequest - password', () => {
  it('passes with a password of exactly 6 characters', async () => {
    const dto = buildDto({ email: 'user@example.com', password: 'abc123' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });

  it('passes with a password of exactly 255 characters', async () => {
    const dto = buildDto({ email: 'user@example.com', password: 'a'.repeat(255) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });

  it('passes with a password between 6 and 255 characters', async () => {
    const dto = buildDto({ email: 'user@example.com', password: 'validpassword' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });

  it('fails when password is missing', async () => {
    const dto = buildDto({ email: 'user@example.com' });
    const constraints = await getErrors(dto, 'password');
    expect(constraints.length).toBeGreaterThan(0);
  });

  it('fails when password is an empty string', async () => {
    const dto = buildDto({ email: 'user@example.com', password: '' });
    const constraints = await getErrors(dto, 'password');
    expect(constraints).toContain('minLength');
  });

  it('fails when password is shorter than 6 characters', async () => {
    const dto = buildDto({ email: 'user@example.com', password: 'abc' });
    const constraints = await getErrors(dto, 'password');
    expect(constraints).toContain('minLength');
  });

  it('fails when password is longer than 255 characters', async () => {
    const dto = buildDto({ email: 'user@example.com', password: 'a'.repeat(256) });
    const constraints = await getErrors(dto, 'password');
    expect(constraints).toContain('maxLength');
  });

  it('fails when password is not a string (number)', async () => {
    const dto = buildDto({ email: 'user@example.com', password: 123456 as unknown as string });
    const constraints = await getErrors(dto, 'password');
    expect(constraints).toContain('isString');
  });
});

// ---------------------------------------------------------------------------

describe('LoginRequest - full DTO', () => {
  it('returns no errors for a fully valid payload', async () => {
    const dto = buildDto({ email: 'admin@blog.dev', password: 'Str0ngPass!' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('reports both email and password errors when both fields are invalid', async () => {
    const dto = buildDto({ email: 'bad-email', password: '123' });
    const errors = await validate(dto);
    const props = errors.map((e) => e.property);
    expect(props).toContain('email');
    expect(props).toContain('password');
  });
});

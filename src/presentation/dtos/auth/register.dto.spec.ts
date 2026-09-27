import 'reflect-metadata';

import { describe, expect, it } from 'bun:test';
import { validate } from 'class-validator';
import { PublicRegisterRequest } from './register.dto';

function buildDto(data: Partial<PublicRegisterRequest>): PublicRegisterRequest {
  return Object.assign(new PublicRegisterRequest(), data);
}

async function getErrors(dto: PublicRegisterRequest, property: keyof PublicRegisterRequest) {
  const errors = await validate(dto);
  const field = errors.find((error) => error.property === property);
  return Object.keys(field?.constraints ?? {});
}

describe('PublicRegisterRequest - username', () => {
  it('accepts a valid username', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a missing or empty username', async () => {
    const missingUsername = buildDto({
      email: 'john@example.com',
      password: 'password123',
    });
    const emptyUsername = buildDto({
      username: '',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(await getErrors(missingUsername, 'username')).toContain('isNotEmpty');
    expect(await getErrors(emptyUsername, 'username')).toContain('isNotEmpty');
  });

  it('rejects a non-string username', async () => {
    const dto = buildDto({
      username: 12345 as unknown as string,
      email: 'john@example.com',
      password: 'password123',
    });

    expect(await getErrors(dto, 'username')).toContain('isString');
  });

  it('rejects usernames shorter than 3 characters', async () => {
    const dto = buildDto({
      username: 'ab',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(await getErrors(dto, 'username')).toContain('minLength');
  });

  it('rejects usernames longer than 30 characters', async () => {
    const dto = buildDto({
      username: 'a'.repeat(31),
      email: 'john@example.com',
      password: 'password123',
    });

    expect(await getErrors(dto, 'username')).toContain('maxLength');
  });

  it('rejects usernames containing spaces or special characters', async () => {
    const dtoWithSpace = buildDto({
      username: 'john doe',
      email: 'john@example.com',
      password: 'password123',
    });
    const dtoWithSpecial = buildDto({
      username: 'john@doe!',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(await getErrors(dtoWithSpace, 'username')).toContain('matches');
    expect(await getErrors(dtoWithSpecial, 'username')).toContain('matches');
  });
});

describe('PublicRegisterRequest - inherited login fields', () => {
  it('rejects an invalid email', async () => {
    const dto = buildDto({
      username: 'john_doe',
      email: 'invalid-email',
      password: 'password123',
    });

    expect(await getErrors(dto, 'email')).toContain('isEmail');
  });

  it('rejects passwords outside the allowed length', async () => {
    const shortPassword = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: '123',
    });
    const longPassword = buildDto({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'a'.repeat(256),
    });

    expect(await getErrors(shortPassword, 'password')).toContain('minLength');
    expect(await getErrors(longPassword, 'password')).toContain('maxLength');
  });
});

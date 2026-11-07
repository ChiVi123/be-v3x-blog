import 'reflect-metadata';

import { describe, expect, it } from 'bun:test';
import { Environment, validateEnvironment } from './env';

const DB_URL_VALID = 'postgresql://user:password@localhost:5432/blog';
const JWT_SECRET_VALID = 'super-secret-key';
const PORT_DEFAULT = '8080';

describe('validateEnvironment', () => {
  it('should pass with a postgres URL and JWT_SECRET (top-level domain is not required)', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        JWT_SECRET: JWT_SECRET_VALID,
      }),
    ).not.toThrow();
  });

  it('should pass with a docker postgres URL containing special characters like @ in password', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: 'postgresql://v3x-blog:bP@ssw0rd@postgres-db:5432/v3x_blog_db',
        JWT_SECRET: JWT_SECRET_VALID,
      }),
    ).not.toThrow();
  });

  it('should fail when missing JWT_SECRET', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
      }),
    ).toThrow();
  });

  it('should fail with a non-postgres URL', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: 'mongodb://localhost:27017/blog',
        JWT_SECRET: JWT_SECRET_VALID,
      }),
    ).toThrow();
  });

  it('should fail with a whitespace string URL', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: '        ',
        JWT_SECRET: JWT_SECRET_VALID,
      }),
    ).toThrow();
  });

  it('should fail with an empty string DB_URL', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: '',
        JWT_SECRET: JWT_SECRET_VALID,
      }),
    ).toThrow();
  });

  it('should fail with an undefined DB_URL', () => {
    expect(() => validateEnvironment({ JWT_SECRET: JWT_SECRET_VALID })).toThrow();
  });

  it('should fail with a null DB_URL', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: null,
        JWT_SECRET: JWT_SECRET_VALID,
      }),
    ).toThrow();
  });

  it('should pass with a valid port', () => {
    const env = {
      DB_URL: DB_URL_VALID,
      JWT_SECRET: JWT_SECRET_VALID,
      PORT: '5000',
    };

    expect(() => validateEnvironment(env)).not.toThrow();

    const validated = validateEnvironment(env);
    expect(validated).toBeInstanceOf(Environment);
    expect(validated.DB_URL).toBe(DB_URL_VALID);
    expect(validated.PORT).toBe('5000');
  });

  it('should pass when missing PORT', () => {
    const env = {
      DB_URL: DB_URL_VALID,
      JWT_SECRET: JWT_SECRET_VALID,
    };

    expect(() => validateEnvironment(env)).not.toThrow();

    const validated = validateEnvironment(env);
    expect(validated).toBeInstanceOf(Environment);
    expect(validated.DB_URL).toBe(DB_URL_VALID);
    expect(validated.PORT).toBe(PORT_DEFAULT);
  });

  it('should fail with an invalid port', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        JWT_SECRET: JWT_SECRET_VALID,
        PORT: 'invalid-port',
      }),
    ).toThrow();
  });

  it('should fail with port is 65536', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        JWT_SECRET: JWT_SECRET_VALID,
        PORT: '65536',
      }),
    ).toThrow();
  });

  it('should fail with a negative port', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        JWT_SECRET: JWT_SECRET_VALID,
        PORT: '-1',
      }),
    ).toThrow();
  });

  it('should fail with port is not an integer', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        JWT_SECRET: JWT_SECRET_VALID,
        PORT: '8080.5',
      }),
    ).toThrow();
  });

  it('should pass with valid expiry values (ms string or number)', () => {
    const env = {
      DB_URL: DB_URL_VALID,
      JWT_SECRET: JWT_SECRET_VALID,
      ACCESS_TOKEN_EXPIRY: '30m',
      REFRESH_TOKEN_EXPIRY: '14d',
    };

    expect(() => validateEnvironment(env)).not.toThrow();
    const validated = validateEnvironment(env);
    expect(validated.ACCESS_TOKEN_EXPIRY).toBe('30m');
    expect(validated.REFRESH_TOKEN_EXPIRY).toBe('14d');
  });

  it('should fail with invalid expiry values', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        JWT_SECRET: JWT_SECRET_VALID,
        ACCESS_TOKEN_EXPIRY: 'invalid-expiry-value',
      }),
    ).toThrow();
  });

  it('should default AUTO_MIGRATE to true when not provided', () => {
    const validated = validateEnvironment({
      DB_URL: DB_URL_VALID,
      JWT_SECRET: JWT_SECRET_VALID,
    });
    expect(validated.AUTO_MIGRATE).toBe(true);
  });

  it('should parse AUTO_MIGRATE string "false" as boolean false', () => {
    const validated = validateEnvironment({
      DB_URL: DB_URL_VALID,
      JWT_SECRET: JWT_SECRET_VALID,
      AUTO_MIGRATE: 'false',
    });
    expect(validated.AUTO_MIGRATE).toBe(false);
  });

  it('should parse optional MIGRATIONS_FOLDER', () => {
    const validated = validateEnvironment({
      DB_URL: DB_URL_VALID,
      JWT_SECRET: JWT_SECRET_VALID,
      MIGRATIONS_FOLDER: 'custom-drizzle',
    });
    expect(validated.MIGRATIONS_FOLDER).toBe('custom-drizzle');
  });
});

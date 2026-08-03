import 'reflect-metadata';

import { describe, expect, it } from 'bun:test';
import { Environment, validateEnvironment } from './env';

const DB_URL_VALID = 'postgresql://user:password@localhost:5432/blog';
const PORT_DEFAULT = '8080';

describe('validateEnvironment', () => {
  it('should pass with a postgres URL (top-level domain is not required)', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
      }),
    ).not.toThrow();
  });

  it('should fail with a non-postgres URL', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: 'mongodb://localhost:27017/blog',
      }),
    ).toThrow();
  });

  it('should fail with a whitespace string URL', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: '        ',
      }),
    ).toThrow();
  });

  it('should fail with an empty string DB_URL', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: '',
      }),
    ).toThrow();
  });

  it('should fail with an undefined DB_URL', () => {
    expect(() => validateEnvironment({})).toThrow();
  });

  it('should fail with a null DB_URL', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: null,
      }),
    ).toThrow();
  });

  it('should pass with a valid port', () => {
    const env = {
      DB_URL: DB_URL_VALID,
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
        PORT: 'invalid-port',
      }),
    ).toThrow();
  });

  it('should fail with port is 65536', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        PORT: '65536',
      }),
    ).toThrow();
  });

  it('should fail with a negative port', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        PORT: '-1',
      }),
    ).toThrow();
  });

  it('should fail with port is not an integer', () => {
    expect(() =>
      validateEnvironment({
        DB_URL: DB_URL_VALID,
        PORT: '8080.5',
      }),
    ).toThrow();
  });
});

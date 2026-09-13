import { describe, expect, it, mock } from 'bun:test';
import { type ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ConflictException,
  DomainException,
  EntityNotFoundException,
  ForbiddenException,
  InvalidCredentialsException,
  UnauthorizedException,
  UserAlreadyExistsException,
} from '~domain/exceptions';
import { GlobalExceptionFilter } from './global-exception.filter';

class CustomDomainException extends DomainException {
  readonly code = 'CUSTOM_ERROR';
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  const createMockHost = (url = '/test-path') => {
    let capturedStatus: number | undefined;
    let capturedJson: unknown;

    const mockResponse = {
      status: mock((status: number) => {
        capturedStatus = status;
        return mockResponse;
      }),
      json: mock((body: unknown) => {
        capturedJson = body;
        return mockResponse;
      }),
    } as unknown as Response;

    const mockRequest = {
      url,
    } as unknown as Request;

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    return {
      host: mockHost,
      getStatus: () => capturedStatus,
      getJson: () => capturedJson as Record<string, unknown>,
    };
  };

  it('should map InvalidCredentialsException to 401 Unauthorized', () => {
    const { host, getStatus, getJson } = createMockHost('/auth/login');
    const exception = new InvalidCredentialsException();

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    const json = getJson();
    expect(json.statusCode).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(json.message).toBe('Invalid email or password');
    expect(json.code).toBe('INVALID_CREDENTIALS');
    expect(json.path).toBe('/auth/login');
    expect(json.timestamp).toBeDefined();
  });

  it('should map UnauthorizedException to 401 Unauthorized', () => {
    const { host, getStatus, getJson } = createMockHost('/auth/me');
    const exception = new UnauthorizedException('Token is invalid');

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    const json = getJson();
    expect(json.statusCode).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(json.message).toBe('Token is invalid');
    expect(json.code).toBe('UNAUTHORIZED');
  });

  it('should map ForbiddenException to 403 Forbidden', () => {
    const { host, getStatus, getJson } = createMockHost('/admin/dashboard');
    const exception = new ForbiddenException('Access denied');

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.FORBIDDEN);
    const json = getJson();
    expect(json.statusCode).toBe(403);
    expect(json.error).toBe('Forbidden');
    expect(json.message).toBe('Access denied');
    expect(json.code).toBe('FORBIDDEN');
  });

  it('should map EntityNotFoundException to 404 Not Found', () => {
    const { host, getStatus, getJson } = createMockHost('/posts/123');
    const exception = new EntityNotFoundException('Post', '123');

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.NOT_FOUND);
    const json = getJson();
    expect(json.statusCode).toBe(404);
    expect(json.error).toBe('Not Found');
    expect(json.message).toBe('Post with ID 123 not found');
    expect(json.code).toBe('ENTITY_NOT_FOUND');
  });

  it('should map ConflictException and UserAlreadyExistsException to 409 Conflict', () => {
    const { host, getStatus, getJson } = createMockHost('/auth/register');
    const exception = new UserAlreadyExistsException();

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.CONFLICT);
    const json = getJson();
    expect(json.statusCode).toBe(409);
    expect(json.error).toBe('Conflict');
    expect(json.message).toBe('User already exists');
    expect(json.code).toBe('USER_ALREADY_EXISTS');
  });

  it('should map base ConflictException to 409 Conflict', () => {
    const { host, getStatus, getJson } = createMockHost('/resource');
    const exception = new ConflictException('Resource version conflict');

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.CONFLICT);
    const json = getJson();
    expect(json.statusCode).toBe(409);
    expect(json.error).toBe('Conflict');
    expect(json.message).toBe('Resource version conflict');
  });

  it('should map custom DomainException fallback to 400 Bad Request', () => {
    const { host, getStatus, getJson } = createMockHost('/resource');
    const exception = new CustomDomainException('Something invalid');

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.BAD_REQUEST);
    const json = getJson();
    expect(json.statusCode).toBe(400);
    expect(json.error).toBe('Bad Request');
    expect(json.message).toBe('Something invalid');
    expect(json.code).toBe('CUSTOM_ERROR');
  });

  it('should format NestJS HttpException properly', () => {
    const { host, getStatus, getJson } = createMockHost('/auth/login');
    const exception = new BadRequestException(['email must be an email']);

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.BAD_REQUEST);
    const json = getJson();
    expect(json.statusCode).toBe(400);
    expect(json.error).toBe('Bad Request');
    expect(json.message).toEqual(['email must be an email']);
    expect(json.path).toBe('/auth/login');
  });

  it('should map unhandled generic Error to 500 Internal Server Error without leaking internal message', () => {
    const { host, getStatus, getJson } = createMockHost('/secret');
    const exception = new Error('Database connection failed unexpectedly');

    filter.catch(exception, host);

    expect(getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const json = getJson();
    expect(json.statusCode).toBe(500);
    expect(json.error).toBe('Internal Server Error');
    expect(json.message).toBe('Internal server error');
    expect(json.code).toBeUndefined();
  });
});

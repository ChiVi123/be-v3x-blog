import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ConflictException,
  DomainException,
  EntityNotFoundException,
  ForbiddenException,
  InvalidCredentialsException,
  UnauthorizedException,
} from '~domain/exceptions';

export type ErrorResponsePayload = {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  timestamp: string;
  path: string;
};

type ResolvedError = Omit<ErrorResponsePayload, 'timestamp' | 'path'>;

type HttpErrorDescriptor = { statusCode: HttpStatus; error: string };

/**
 * Maps each DomainException class to its HTTP status and error label.
 * Entries are evaluated in order — put more-specific subclasses before their parents.
 * To add a new mapping: append one entry here, nothing else needs to change.
 */
const DOMAIN_EXCEPTION_MAP: Array<[new (...args: never[]) => DomainException, HttpErrorDescriptor]> = [
  [InvalidCredentialsException, { statusCode: HttpStatus.UNAUTHORIZED, error: 'Unauthorized' }],
  [UnauthorizedException, { statusCode: HttpStatus.UNAUTHORIZED, error: 'Unauthorized' }],
  [ForbiddenException, { statusCode: HttpStatus.FORBIDDEN, error: 'Forbidden' }],
  [EntityNotFoundException, { statusCode: HttpStatus.NOT_FOUND, error: 'Not Found' }],
  [ConflictException, { statusCode: HttpStatus.CONFLICT, error: 'Conflict' }],
];

const DEFAULT_DOMAIN_DESCRIPTOR: HttpErrorDescriptor = { statusCode: HttpStatus.BAD_REQUEST, error: 'Bad Request' };

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const payload: ErrorResponsePayload = {
      ...this.resolve(exception),
      timestamp: new Date().toISOString(),
      path: request?.url ?? '',
    };

    response.status(payload.statusCode).json(payload);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) return this.resolveHttpException(exception);
    if (exception instanceof DomainException) return this.resolveDomainException(exception);
    return this.resolveUnknown(exception);
  }

  private resolveHttpException(exception: HttpException): ResolvedError {
    const statusCode = exception.getStatus();
    const raw = exception.getResponse();

    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      return {
        statusCode,
        error: (obj.error as string) ?? HttpStatus[statusCode] ?? 'Error',
        message: (obj.message as string | string[]) ?? exception.message,
      };
    }

    return {
      statusCode,
      error: HttpStatus[statusCode] ?? 'Error',
      message: (raw as string) ?? exception.message,
    };
  }

  private resolveDomainException(exception: DomainException): ResolvedError {
    const { statusCode, error } =
      DOMAIN_EXCEPTION_MAP.find(([ExceptionClass]) => exception instanceof ExceptionClass)?.[1] ??
      DEFAULT_DOMAIN_DESCRIPTOR;

    return { statusCode, error, message: exception.message, code: exception.code };
  }

  private resolveUnknown(exception: unknown): ResolvedError {
    const err = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(`Unhandled exception: ${err.message}`, err.stack);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
    };
  }
}

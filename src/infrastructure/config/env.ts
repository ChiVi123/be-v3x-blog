import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPort,
  IsString,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  validateSync,
} from 'class-validator';
import ms from 'ms';

const ACCESS_TOKEN_EXPIRY_DEFAULT = '15m';
const REFRESH_TOKEN_EXPIRY_DEFAULT = '7d';

function IsMsValue(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isMsValue',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value === 'number') {
            return !Number.isNaN(value) && Number.isFinite(value);
          }
          if (typeof value === 'string' && value.trim().length > 0) {
            try {
              const parsed = ms(value as ms.StringValue);
              return typeof parsed === 'number' && !Number.isNaN(parsed);
            } catch {
              return false;
            }
          }
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ms duration string (e.g. "15m", "7d") or number of milliseconds`;
        },
      },
    });
  };
}

function IsDatabaseUrl(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isDatabaseUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || value.trim().length === 0) {
            return false;
          }
          try {
            const parsed = new URL(value);
            return (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') && Boolean(parsed.hostname);
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid PostgreSQL connection URL (e.g. "postgresql://user:pass@host:5432/db")`;
        },
      },
    });
  };
}

/**
 * Returns a human-readable reason when `origin` is not a valid CORS origin,
 * or `null` when it is valid. A valid origin is exactly what browsers send
 * in the `Origin` header: scheme + host (+ non-default port), nothing else.
 */
function getCorsOriginError(origin: string): string | null {
  if (origin === '*') {
    return '"*" is not allowed (credentials are enabled), list each origin explicitly';
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return `"${origin}" is not a valid URL`;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `"${origin}" must use http or https`;
  }

  if (origin.endsWith('/')) {
    return `"${origin}" must not end with "/"`;
  }

  // origin is normalized by URL (lowercase host, default port removed, no path/query/hash).
  // If it differs from the input, the input would never match a browser's Origin header.
  if (parsed.origin !== origin) {
    return `"${origin}" must be a bare origin (scheme://host[:port]), expected "${parsed.origin}"`;
  }

  return null;
}

function IsCorsOrigins(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isCorsOrigins',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }
          // An empty value means "CORS disabled" (see getCorsOrigins in app.setup.ts).
          if (value.trim().length === 0) {
            return true;
          }
          return value.split(',').every((item) => getCorsOriginError(item.trim()) === null);
        },
        defaultMessage(args: ValidationArguments) {
          const value = typeof args.value === 'string' ? args.value : '';
          const reasons = value
            .split(',')
            .map((item) => getCorsOriginError(item.trim()))
            .filter((reason): reason is string => reason !== null);
          const detail = reasons.length > 0 ? `: ${reasons.join('; ')}` : '';
          return `${args.property} must be a comma-separated list of origins (e.g. "https://tap.blog,https://admin.tap.blog")${detail}`;
        },
      },
    });
  };
}

export class Environment {
  @IsDatabaseUrl()
  DB_URL: string;

  @IsOptional()
  @IsPort()
  PORT: string = '8080';

  @IsNotEmpty()
  JWT_SECRET: string;

  @IsOptional()
  @IsMsValue()
  ACCESS_TOKEN_EXPIRY: number | ms.StringValue = ACCESS_TOKEN_EXPIRY_DEFAULT;

  @IsOptional()
  @IsMsValue()
  REFRESH_TOKEN_EXPIRY: number | ms.StringValue = REFRESH_TOKEN_EXPIRY_DEFAULT;

  @IsOptional()
  @IsEnum(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @IsOptional()
  @IsString()
  @IsCorsOrigins()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false' && value !== '0';
  })
  AUTO_MIGRATE: boolean | string = true;

  @IsOptional()
  @IsString()
  MIGRATIONS_FOLDER?: string;
}

@Injectable()
export class AppConfigService extends ConfigService<Environment, true> {
  override get<K extends keyof Environment>(key: K): Environment[K] {
    return super.get(key, { infer: true });
  }
}

export function validateEnvironment(env: Record<string, unknown>) {
  const instance = plainToInstance(Environment, env, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(instance);
  if (errors.length > 0) {
    const details = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .map((message) => ` - ${message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return instance;
}

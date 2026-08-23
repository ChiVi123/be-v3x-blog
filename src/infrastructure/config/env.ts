import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsPort,
  IsUrl,
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

export class Environment {
  @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false })
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
    throw new Error(errors.toString());
  }
  return instance;
}

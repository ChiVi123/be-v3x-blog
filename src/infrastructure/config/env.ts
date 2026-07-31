import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IsOptional, IsPort, IsUrl, validateSync } from 'class-validator';

export class Environment {
  @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false })
  DB_URL: string;

  @IsOptional()
  @IsPort()
  PORT: string = '8080';
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

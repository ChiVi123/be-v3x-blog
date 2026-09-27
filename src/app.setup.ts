import { type INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { AppConfigService } from '~infrastructure/config/env';

function getCorsOrigins(value: string | undefined): string[] {
  return (
    value
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  );
}

export function configureApplication(app: INestApplication, config: AppConfigService): void {
  const corsOrigins = getCorsOrigins(config.get('CORS_ORIGINS'));

  app.use(cookieParser());

  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });
  }

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}

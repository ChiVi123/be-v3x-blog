import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigService } from '~infrastructure/config/env';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const port = config.get('PORT');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(port);

  process.stdin.on('data', (data) => {
    const key = data.toString().trim().toLowerCase();
    if (key === 'q') {
      app.close().then(() => {
        Logger.log('Application closed gracefully', 'Bootstrap');
        process.exit(0);
      });
    }
  });
}
bootstrap();

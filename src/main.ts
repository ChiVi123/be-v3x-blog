import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigService } from '~infrastructure/config/env';
import { AppModule } from './app.module';
import { configureApplication } from './app.setup';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const port = config.get('PORT');

  configureApplication(app, config);
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log('Press q + Enter to close the application');

  process.stdin.on('data', (data) => {
    const key = data.toString().trim().toLowerCase();
    if (key === 'q') {
      app.close().then(() => {
        logger.log('Application closed gracefully');
        process.exit(0);
      });
    }
  });
}
bootstrap();

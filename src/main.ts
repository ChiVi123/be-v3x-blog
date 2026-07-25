import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);

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

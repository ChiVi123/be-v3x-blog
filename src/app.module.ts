import { Module } from '@nestjs/common';
import { ServicesModule } from '~infrastructure/services/services.module';
import { HealthCheckModule } from '~presentation/controllers/health-check.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ServicesModule, HealthCheckModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

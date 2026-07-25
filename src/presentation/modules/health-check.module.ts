import { Module } from '@nestjs/common';
import type { GetOkService } from '~application/services/get-ok.service';
import { HealthCheckUseCase } from '~application/use-cases/health-check.use-case';
import { GET_OK_SERVICE_TOKEN, HEALTH_CHECK_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
import { HealthCheckController } from '../controllers/health-check.controller';

@Module({
  imports: [],
  controllers: [HealthCheckController],
  providers: [
    {
      provide: HEALTH_CHECK_USE_CASE_TOKEN,
      useFactory: (service: GetOkService) => new HealthCheckUseCase(service),
      inject: [GET_OK_SERVICE_TOKEN],
    },
  ],
})
export class HealthCheckModule {}

import { Module } from '@nestjs/common';
import type { GetOkService } from '~application/services/get-ok.service';
import { HealthCheckUseCase } from '~application/use-cases/health-check.use-case';
import { GET_OK_SERVICE_TOKEN, HEALTH_CHECK_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
import { HealthCheckController } from './health-check.controller';

@Module({
  imports: [],
  controllers: [HealthCheckController],
  providers: [
    {
      provide: HEALTH_CHECK_USE_CASE_TOKEN,
      useFactory: (getOkService: GetOkService) => new HealthCheckUseCase(getOkService),
      inject: [GET_OK_SERVICE_TOKEN],
    },
  ],
})
export class HealthCheckModule {}

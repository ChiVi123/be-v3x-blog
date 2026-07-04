import { Controller, Get, Inject } from '@nestjs/common';
import type { HealthCheckUseCase } from '~application/use-cases/health-check.use-case';
import { HEALTH_CHECK_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';

@Controller()
export class HealthCheckController {
  constructor(
    @Inject(HEALTH_CHECK_USE_CASE_TOKEN)
    private readonly healthCheckUseCase: HealthCheckUseCase,
  ) {}

  @Get('health')
  getHealth(): string {
    return this.healthCheckUseCase.execute();
  }
}

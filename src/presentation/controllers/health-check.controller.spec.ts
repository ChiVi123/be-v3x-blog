import { describe, expect, it } from 'bun:test';
import { beforeEach } from 'node:test';
import { Test, type TestingModule } from '@nestjs/testing';
import type { GetOkService } from '~application/services/get-ok.service';
import { HealthCheckUseCase } from '~application/use-cases/health-check.use-case';
import { GET_OK_SERVICE_TOKEN, HEALTH_CHECK_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
import { ServicesModule } from '~infrastructure/services/services.module';
import { HealthCheckController } from '~presentation/controllers/health-check.controller';

describe('HealthCheckController', () => {
  let controller: HealthCheckController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [ServicesModule],
      controllers: [HealthCheckController],
      providers: [
        {
          provide: HEALTH_CHECK_USE_CASE_TOKEN,
          useFactory: (getOkService: GetOkService) => new HealthCheckUseCase(getOkService),
          inject: [GET_OK_SERVICE_TOKEN],
        },
      ],
    }).compile();

    controller = app.get<HealthCheckController>(HealthCheckController);
  });

  describe('root', () => {
    it('should return "Ok"', async () => {
      expect(controller.getHealth()).toBe('Ok');
    });
  });
});

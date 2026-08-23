import 'reflect-metadata';

import { beforeEach, describe, expect, it } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import type { GetOkService } from '~application/services/get-ok.service';
import { HealthCheckUseCase } from '~application/use-cases/health-check.use-case';
import { HEALTH_CHECK_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
import { HealthCheckController } from '~presentation/controllers/health-check.controller';

const mockGetOkService: GetOkService = {
  getOk: () => 'Ok',
};

describe('HealthCheckController', () => {
  let controller: HealthCheckController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthCheckController],
      providers: [
        {
          provide: HEALTH_CHECK_USE_CASE_TOKEN,
          useValue: new HealthCheckUseCase(mockGetOkService),
        },
      ],
    }).compile();

    controller = app.get<HealthCheckController>(HealthCheckController);
  });

  describe('root', () => {
    it('should return "Ok"', () => {
      expect(controller.getHealth()).toBe('Ok');
    });
  });
});

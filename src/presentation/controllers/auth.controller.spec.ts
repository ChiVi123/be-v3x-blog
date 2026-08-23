import 'reflect-metadata';

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import type { LoginUseCase } from '~application/use-cases/login.use-case';
import { LOGIN_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
import { AuthController } from '~presentation/controllers/auth.controller';
import type { LoginRequest } from '~presentation/dtos/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let mockLoginUseCase: { execute: ReturnType<typeof mock> };

  beforeEach(async () => {
    mockLoginUseCase = {
      execute: mock(async () => ({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: LOGIN_USE_CASE_TOKEN,
          useValue: mockLoginUseCase as unknown as LoginUseCase,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should extract ipAddress from req.ip and userAgent from headers and pass to loginUseCase', async () => {
      const body: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      const req = {
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'x-forwarded-for': '203.0.113.195',
        },
      } as unknown as Request;

      const result = await controller.login(body, req);

      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        clientContext: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should fallback to "0.0.0.0" when req.ip is undefined', async () => {
      const body: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      const req = {
        ip: undefined,
        headers: {
          'user-agent': 'PostmanRuntime/7.29.0',
        },
      } as unknown as Request;

      await controller.login(body, req);

      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        clientContext: {
          ipAddress: '0.0.0.0',
          userAgent: 'PostmanRuntime/7.29.0',
        },
      });
    });

    it('should fallback to "Unknown" when user-agent header is missing', async () => {
      const body: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      const req = {
        ip: '10.0.0.1',
        headers: {},
      } as unknown as Request;

      await controller.login(body, req);

      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        clientContext: {
          ipAddress: '10.0.0.1',
          userAgent: 'Unknown',
        },
      });
    });

    it('should fallback to default values when both ip and user-agent are missing', async () => {
      const body: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      const req = {
        headers: {},
      } as unknown as Request;

      await controller.login(body, req);

      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        clientContext: {
          ipAddress: '0.0.0.0',
          userAgent: 'Unknown',
        },
      });
    });
  });
});

import 'reflect-metadata';

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import type { RegisterUseCase } from '~application/use-cases/auth/register.use-case';
import type { LoginUseCase } from '~application/use-cases/login.use-case';
import { Role } from '~domain/entities/user.entity';
import { LOGIN_USE_CASE_TOKEN, REGISTER_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
import { AuthController } from '~presentation/controllers/auth.controller';
import type { RegisterRequest } from '~presentation/dtos/auth/register.dto';
import type { LoginRequest } from '~presentation/dtos/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let mockLoginUseCase: { execute: ReturnType<typeof mock> };
  let mockRegisterUseCase: { execute: ReturnType<typeof mock> };

  beforeEach(async () => {
    mockLoginUseCase = {
      execute: mock(async () => ({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      })),
    };

    mockRegisterUseCase = {
      execute: mock(async () => undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: LOGIN_USE_CASE_TOKEN,
          useValue: mockLoginUseCase as unknown as LoginUseCase,
        },
        {
          provide: REGISTER_USE_CASE_TOKEN,
          useValue: mockRegisterUseCase as unknown as RegisterUseCase,
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

  describe('register', () => {
    it('should pass register parameters with role to registerUseCase and return the result', async () => {
      const body: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: Role.ADMIN,
      };

      const result = await controller.register(body);

      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: Role.ADMIN,
      });
      expect(result).toBeUndefined();
    });

    it('should pass register parameters without optional role to registerUseCase', async () => {
      const body: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      await controller.register(body);

      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: undefined,
      });
    });

    it('should propagate errors when registerUseCase throws', async () => {
      const body: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      mockRegisterUseCase.execute = mock(async () => {
        throw new Error('User already exists');
      });

      expect(controller.register(body)).rejects.toThrow('User already exists');
    });
  });
});

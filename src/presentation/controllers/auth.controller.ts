import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { RegisterUseCase } from '~application/use-cases/auth/register.use-case';
import type { LoginUseCase } from '~application/use-cases/login.use-case';
import { LOGIN_USE_CASE_TOKEN, REGISTER_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { RegisterRequest } from '~presentation/dtos/auth/register.dto';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { LoginRequest } from '~presentation/dtos/login.dto';

@Controller('auth')
export class AuthController {
  // private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(LOGIN_USE_CASE_TOKEN)
    private readonly loginUseCase: LoginUseCase,
    @Inject(REGISTER_USE_CASE_TOKEN)
    private readonly registerUseCase: RegisterUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequest, @Req() req: Request) {
    return this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      clientContext: {
        ipAddress: req.ip ?? '0.0.0.0', // TODO: Check x-forwarded-for header
        userAgent: req.headers['user-agent'] ?? 'Unknown',
      },
    });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterRequest) {
    return this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      username: body.username,
      role: body.role,
    });
  }
}

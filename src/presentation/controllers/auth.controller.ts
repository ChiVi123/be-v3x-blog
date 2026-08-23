import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { LoginUseCase } from '~application/use-cases/login.use-case';
import { LOGIN_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { LoginRequest } from '~presentation/dtos/login.dto';

@Controller('auth')
export class AuthController {
  // private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(LOGIN_USE_CASE_TOKEN)
    private readonly loginUseCase: LoginUseCase,
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
}

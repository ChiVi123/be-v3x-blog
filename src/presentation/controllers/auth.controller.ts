import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import type { ClientContext } from '~application/types/use-case.type';
import type { GetMeUseCase, LogoutUseCase, RefreshUseCase, RegisterUseCase } from '~application/use-cases/auth';
import type { LoginUseCase } from '~application/use-cases/auth/login.use-case';
import { Role } from '~domain/entities/user.entity';
import { UnauthorizedException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';
import { AppConfigService } from '~infrastructure/config/env';
import {
  GET_ME_USE_CASE_TOKEN,
  LOGIN_USE_CASE_TOKEN,
  LOGOUT_USE_CASE_TOKEN,
  REFRESH_USE_CASE_TOKEN,
  REGISTER_USE_CASE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { ClientInfo, CurrentUser } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { PublicRegisterRequest } from '~presentation/dtos/auth/register.dto';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { LoginRequest } from '~presentation/dtos/login.dto';
import { JwtAuthGuard } from '~presentation/guards';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh-token';
const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

@Controller('auth')
export class AuthController {
  // private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(LOGIN_USE_CASE_TOKEN)
    private readonly loginUseCase: LoginUseCase,
    @Inject(REGISTER_USE_CASE_TOKEN)
    private readonly registerUseCase: RegisterUseCase,
    @Inject(REFRESH_USE_CASE_TOKEN)
    private readonly refreshUseCase: RefreshUseCase,
    @Inject(LOGOUT_USE_CASE_TOKEN)
    private readonly logoutUseCase: LogoutUseCase,
    @Inject(GET_ME_USE_CASE_TOKEN)
    private readonly getMeUseCase: GetMeUseCase,
    @Inject(AppConfigService) private readonly configService: AppConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: ONE_MINUTE_MS } })
  async login(
    @Body() body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
    @ClientInfo() clientContext: ClientContext,
  ) {
    const { refreshToken, refreshTokenExpiryDate, accessToken } = await this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      clientContext,
    });

    this.setRefreshTokenCookie(res, refreshToken, refreshTokenExpiryDate);

    return { accessToken, refreshTokenExpiryDate };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: ONE_HOUR_MS } })
  async register(@Body() body: PublicRegisterRequest) {
    return this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      username: body.username,
      role: Role.USER,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: ONE_MINUTE_MS } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @ClientInfo() clientContext: ClientContext,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiryDate,
    } = await this.refreshUseCase.execute({
      refreshToken,
      clientContext,
    });

    this.setRefreshTokenCookie(res, newRefreshToken, refreshTokenExpiryDate);
    return { accessToken, refreshTokenExpiryDate };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('id') userId: UserId) {
    return this.getMeUseCase.execute(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      this.clearRefreshTokenCookie(res);
      return;
    }

    try {
      await this.logoutUseCase.execute(refreshToken);
    } finally {
      this.clearRefreshTokenCookie(res);
    }
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, this.getRefreshTokenCookieOptions());
  }

  private getRefreshTokenCookieOptions(expires?: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
      ...(expires ? { expires } : {}),
    };
  }

  private setRefreshTokenCookie(res: Response, token: string, expires: Date): void {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, this.getRefreshTokenCookieOptions(expires));
  }
}

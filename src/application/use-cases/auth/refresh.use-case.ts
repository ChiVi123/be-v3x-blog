import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import type { ClientContext } from '~application/types/use-case.type';
import { UnauthorizedException } from '~domain/exceptions';

export type RefreshUseCaseParams = {
  refreshToken: string;
  clientContext: ClientContext;
};

export type RefreshUseCaseResult = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiryDate: Date;
};

export class RefreshUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
  ) {}

  async execute({ refreshToken, clientContext }: RefreshUseCaseParams): Promise<RefreshUseCaseResult> {
    const session = await this.sessionRepository.findValidByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const newRefreshToken = this.authService.generateRefreshToken();
    const newAccessToken = this.authService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshTokenExpiryDate = this.authService.createRefreshTokenExpiryDate();

    await this.sessionRepository.delete(session.id);
    await this.sessionRepository.create({
      userId: user.id,
      ipAddress: clientContext.ipAddress,
      userAgent: clientContext.userAgent,
      refreshToken: newRefreshToken,
      expiresAt: refreshTokenExpiryDate,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiryDate,
    };
  }
}

import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import type { ClientContext } from '~application/types/use-case.type';
import { InvalidCredentialsException } from '~domain/exceptions';

export type LoginUseCaseParams = {
  email: string;
  password: string;
  clientContext: ClientContext;
};

export type LoginUseCaseResult = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiryDate: Date;
};

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly authService: AuthService,
  ) {}

  async execute({ email, password, clientContext }: LoginUseCaseParams): Promise<LoginUseCaseResult> {
    const user = await this.userRepository.findByEmail(email, true);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await this.authService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const refreshTokenExpiryDate = this.authService.createRefreshTokenExpiryDate();
    const refreshToken = await this.sessionRepository.create({
      userId: user.id,
      ipAddress: clientContext.ipAddress,
      userAgent: clientContext.userAgent,
      refreshToken: this.authService.generateRefreshToken(),
      expiresAt: refreshTokenExpiryDate,
    });
    return {
      accessToken: this.authService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken,
      refreshTokenExpiryDate,
    };
  }
}

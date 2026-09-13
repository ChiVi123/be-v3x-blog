import type { SessionRepository } from '~application/repositories/session.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import { InvalidCredentialsException } from '~domain/exceptions';

type ClientContext = {
  ipAddress: string;
  userAgent: string;
};

export type LoginUseCaseParams = {
  email: string;
  password: string;
  clientContext: ClientContext;
};

export type LoginUseCaseResult = {
  accessToken: string;
  refreshToken: string;
};

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly authService: AuthService,
  ) {}

  async execute({ email, password, clientContext }: LoginUseCaseParams): Promise<LoginUseCaseResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await this.authService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const refreshToken = await this.sessionRepository.create({
      userId: user.id,
      ipAddress: clientContext.ipAddress,
      userAgent: clientContext.userAgent,
      refreshToken: this.authService.generateRefreshToken(),
      expiresAt: this.authService.createRefreshTokenExpiryDate(),
    });
    return {
      accessToken: this.authService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken,
    };
  }
}

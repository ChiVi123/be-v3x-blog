import type { SessionRepository } from '~application/repositories/session.repository';

export class LogoutUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(refreshToken: string): Promise<void> {
    await this.sessionRepository.deleteByRefreshToken(refreshToken);
  }
}

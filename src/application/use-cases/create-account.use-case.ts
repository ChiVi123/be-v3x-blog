import type { UserCreateInput, UserOutput, UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';

export class CreateAccountUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(user: UserCreateInput): Promise<UserOutput> {
    const hashedPassword = await this.authService.hashPassword(user.password);
    const userEntity = await this.userRepository.create({
      ...user,
      password: hashedPassword,
    });
    return userEntity;
  }
}

import type { UserInput, UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import type { UserEntity } from '~domain/entities/user.entity';

export class CreateAccountUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(user: UserInput): Promise<UserEntity> {
    const hashedPassword = await this.authService.hashPassword(user.password);
    const userEntity = await this.userRepository.create({
      ...user,
      password: hashedPassword,
    });
    return userEntity;
  }
}

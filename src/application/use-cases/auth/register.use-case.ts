import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import { Role } from '~domain/entities/user.entity';

export type RegisterParams = {
  email: string;
  password: string;
  username: string;
  role?: Role;
};

export class RegisterUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  // TODO: Send mail to verify email
  async execute({ email, password, username, role = Role.USER }: RegisterParams) {
    const isExist = await this.userRepository.isExistByEmail(email);
    if (isExist) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.authService.hashPassword(password);

    await this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      role,
      avatarId: null,
    });
  }
}

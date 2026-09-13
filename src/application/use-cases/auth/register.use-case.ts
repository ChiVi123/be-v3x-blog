import type { UserRepository } from '~application/repositories/user.repository';
import type { AuthService } from '~application/services/auth.service';
import { Role } from '~domain/entities/user.entity';
import { UserAlreadyExistsException } from '~domain/exceptions';

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
      throw new UserAlreadyExistsException();
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

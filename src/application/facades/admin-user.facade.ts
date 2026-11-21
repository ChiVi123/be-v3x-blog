import type { SessionRepository } from '~application/repositories/session.repository';
import type { AdminUserQuery, UserOutput, UserRepository } from '~application/repositories/user.repository';
import { Role, UserStatus } from '~domain/entities/user.entity';
import { ConflictException, EntityNotFoundException, ForbiddenException } from '~domain/exceptions';
import type { UserId } from '~domain/types/branded';

export type ChangeUserRoleParams = { id: UserId; role: Role; requesterId: UserId };
export type ChangeUserStatusParams = { id: UserId; status: UserStatus; requesterId: UserId };

export class AdminUserFacade {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async list(query: AdminUserQuery) {
    const [users, total] = await Promise.all([
      this.userRepository.searchAdmin(query),
      this.userRepository.countAdmin(query),
    ]);
    return { data: users, total };
  }

  async changeRole({ id, role, requesterId }: ChangeUserRoleParams): Promise<UserOutput> {
    const target = await this.getTarget(id, requesterId);

    // Idempotent: đã đúng giá trị thì không làm gì.
    if (target.role === role) {
      return target;
    }
    if (role !== Role.ADMIN) {
      await this.assertNotLastActiveAdmin(target);
    }

    await this.userRepository.update(id, { role });
    return this.requireUser(id);
  }

  async changeStatus({ id, status, requesterId }: ChangeUserStatusParams): Promise<UserOutput> {
    const target = await this.getTarget(id, requesterId);

    if (target.status === status) {
      return target;
    }
    if (status === UserStatus.BANNED) {
      await this.assertNotLastActiveAdmin(target);
    }

    await this.userRepository.update(id, { status });

    // Khóa tài khoản thì xóa hết session để không refresh được nữa.
    if (status === UserStatus.BANNED) {
      await this.sessionRepository.deleteByUserId(id);
    }
    return this.requireUser(id);
  }

  private async getTarget(id: UserId, requesterId: UserId): Promise<UserOutput> {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot change your own role or status');
    }
    return this.requireUser(id);
  }

  private async requireUser(id: UserId): Promise<UserOutput> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    return user;
  }

  // Chỉ admin đang hoạt động mới được tính; hạ/khóa một admin đã bị khóa thì không ảnh hưởng số này.
  private async assertNotLastActiveAdmin(target: UserOutput): Promise<void> {
    if (target.role !== Role.ADMIN || target.status !== UserStatus.ACTIVE) {
      return;
    }
    if ((await this.userRepository.countActiveAdmins()) <= 1) {
      throw new ConflictException('Cannot demote or ban the last active admin');
    }
  }
}

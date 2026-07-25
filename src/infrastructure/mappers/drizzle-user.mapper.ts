import { UserEntity } from '~domain/entities/user.entity';
import type { UserSelect } from '~infrastructure/database/drizzle/types';

export const userMapper = {
  toEntity: (user: UserSelect): UserEntity => {
    return UserEntity.create(
      user.id,
      user.username,
      user.email,
      user.password,
      user.role,
      user.avatarId,
      user.createdAt,
      user.updatedAt,
    );
  },
  toPersist: (user: UserEntity) => {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      avatarId: user.avatarId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
};

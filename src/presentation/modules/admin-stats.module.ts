import { Module } from '@nestjs/common';
import { AdminStatsFacade } from '~application/facades/admin-stats.facade';
import type { CategoryRepository } from '~application/repositories/category.repository';
import type { PostRepository } from '~application/repositories/post.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import {
  CATEGORY_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { AdminStatsController } from '~presentation/controllers/admin-stats.controller';

@Module({
  controllers: [AdminStatsController],
  providers: [
    {
      provide: AdminStatsFacade,
      useFactory: (postRepo: PostRepository, userRepo: UserRepository, categoryRepo: CategoryRepository) =>
        new AdminStatsFacade(postRepo, userRepo, categoryRepo),
      inject: [POST_REPOSITORY_TOKEN, USER_REPOSITORY_TOKEN, CATEGORY_REPOSITORY_TOKEN],
    },
  ],
})
export class AdminStatsModule {}

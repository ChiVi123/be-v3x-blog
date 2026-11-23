import { Module } from '@nestjs/common';
import { PostFacade } from '~application/facades/post.facade';
import type { PostRepository } from '~application/repositories/post.repository';
import type { UserRepository } from '~application/repositories/user.repository';
import type { TransformService } from '~application/services/transform.service';
import {
  POST_REPOSITORY_TOKEN,
  TRANSFORM_SERVICE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { AdminPostController } from '~presentation/controllers/admin-post.controller';
import { PostController } from '~presentation/controllers/post.controller';

@Module({
  providers: [
    {
      provide: PostFacade,
      useFactory: (postRepo: PostRepository, transformService: TransformService, userRepo: UserRepository) =>
        new PostFacade(postRepo, transformService, userRepo),
      inject: [POST_REPOSITORY_TOKEN, TRANSFORM_SERVICE_TOKEN, USER_REPOSITORY_TOKEN],
    },
  ],
  controllers: [PostController, AdminPostController],
})
export class PostModule {}

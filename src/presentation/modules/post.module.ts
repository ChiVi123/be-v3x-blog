import { Module } from '@nestjs/common';
import { PostFacade } from '~application/facades/post.facade';
import type { PostRepository } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import { POST_REPOSITORY_TOKEN, TRANSFORM_SERVICE_TOKEN } from '~infrastructure/config/provider-tokens';
import { PostController } from '~presentation/controllers/post.controller';

@Module({
  providers: [
    {
      provide: PostFacade,
      useFactory: (postRepo: PostRepository, transformService: TransformService) =>
        new PostFacade(postRepo, transformService),
      inject: [POST_REPOSITORY_TOKEN, TRANSFORM_SERVICE_TOKEN],
    },
  ],
  controllers: [PostController],
})
export class PostModule {}

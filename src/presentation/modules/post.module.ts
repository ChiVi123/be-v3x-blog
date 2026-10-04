import { Module } from '@nestjs/common';
import type { PostRepository } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import { CreatePostUseCase } from '~application/use-cases/post/create-post.use-case';
import {
  CREATE_POST_USE_CASE_TOKEN,
  POST_REPOSITORY_TOKEN,
  TRANSFORM_SERVICE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { PostController } from '~presentation/controllers/post.controller';

@Module({
  imports: [],
  providers: [
    {
      provide: CREATE_POST_USE_CASE_TOKEN,
      useFactory: (postRepo: PostRepository, transformService: TransformService) => {
        return new CreatePostUseCase(postRepo, transformService);
      },
      inject: [POST_REPOSITORY_TOKEN, TRANSFORM_SERVICE_TOKEN],
    },
  ],
  controllers: [PostController],
})
export class PostModule {}

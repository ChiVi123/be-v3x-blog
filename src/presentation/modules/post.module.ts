import { Module } from '@nestjs/common';
import type { PostRepository } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import {
  CreatePostUseCase,
  DeletePostUseCase,
  GetPostDetailUseCase,
  GetPostUseCase,
  ListPostUseCase,
  QueryPostUseCase,
  UpdatePostUseCase,
} from '~application/use-cases/post';
import {
  CREATE_POST_USE_CASE_TOKEN,
  DELETE_POST_USE_CASE_TOKEN,
  GET_POST_DETAIL_USE_CASE_TOKEN,
  GET_POST_USE_CASE_TOKEN,
  LIST_POST_USE_CASE_TOKEN,
  POST_REPOSITORY_TOKEN,
  QUERY_POST_USE_CASE_TOKEN,
  TRANSFORM_SERVICE_TOKEN,
  UPDATE_POST_USE_CASE_TOKEN,
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
    {
      provide: LIST_POST_USE_CASE_TOKEN,
      useFactory: (postRepo: PostRepository) => {
        return new ListPostUseCase(postRepo);
      },
      inject: [POST_REPOSITORY_TOKEN],
    },
    {
      provide: QUERY_POST_USE_CASE_TOKEN,
      useFactory: (postRepo: PostRepository) => {
        return new QueryPostUseCase(postRepo);
      },
      inject: [POST_REPOSITORY_TOKEN],
    },
    {
      provide: GET_POST_USE_CASE_TOKEN,
      useFactory: (postRepo: PostRepository) => {
        return new GetPostUseCase(postRepo);
      },
      inject: [POST_REPOSITORY_TOKEN],
    },
    {
      provide: GET_POST_DETAIL_USE_CASE_TOKEN,
      useFactory: (postRepo: PostRepository) => {
        return new GetPostDetailUseCase(postRepo);
      },
      inject: [POST_REPOSITORY_TOKEN],
    },
    {
      provide: UPDATE_POST_USE_CASE_TOKEN,
      useFactory: (postRepo: PostRepository, transformService: TransformService) => {
        return new UpdatePostUseCase(postRepo, transformService);
      },
      inject: [POST_REPOSITORY_TOKEN, TRANSFORM_SERVICE_TOKEN],
    },
    {
      provide: DELETE_POST_USE_CASE_TOKEN,
      useFactory: (postRepo: PostRepository) => {
        return new DeletePostUseCase(postRepo);
      },
      inject: [POST_REPOSITORY_TOKEN],
    },
  ],
  controllers: [PostController],
})
export class PostModule {}

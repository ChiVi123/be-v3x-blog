import { Global, Module } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY_TOKEN,
  COMMENT_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
  SESSION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import {
  DrizzleCategoryRepository,
  DrizzleCommentRepository,
  DrizzlePostRepository,
  DrizzleSessionRepository,
  DrizzleUserRepository,
} from '~infrastructure/repositories';

@Global()
@Module({
  providers: [
    {
      provide: CATEGORY_REPOSITORY_TOKEN,
      useClass: DrizzleCategoryRepository,
    },
    {
      provide: COMMENT_REPOSITORY_TOKEN,
      useClass: DrizzleCommentRepository,
    },
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: DrizzleUserRepository,
    },
    {
      provide: SESSION_REPOSITORY_TOKEN,
      useClass: DrizzleSessionRepository,
    },
    {
      provide: POST_REPOSITORY_TOKEN,
      useClass: DrizzlePostRepository,
    },
  ],
  exports: [
    {
      provide: COMMENT_REPOSITORY_TOKEN,
      useClass: DrizzleCommentRepository,
    },
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: DrizzleUserRepository,
    },
    {
      provide: SESSION_REPOSITORY_TOKEN,
      useClass: DrizzleSessionRepository,
    },
    {
      provide: POST_REPOSITORY_TOKEN,
      useClass: DrizzlePostRepository,
    },
    {
      provide: CATEGORY_REPOSITORY_TOKEN,
      useClass: DrizzleCategoryRepository,
    },
  ],
})
export class RepositoriesModule {}

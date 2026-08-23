import { Global, Module } from '@nestjs/common';
import {
  COMMENT_REPOSITORY_TOKEN,
  SESSION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { DrizzleCommentRepository } from '~infrastructure/repositories/drizzle-comment.repository';
import { DrizzleSessionRepository } from '~infrastructure/repositories/drizzle-session.repository';
import { DrizzleUserRepository } from '~infrastructure/repositories/drizzle-user.repository';

@Global()
@Module({
  providers: [
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
  ],
})
export class RepositoriesModule {}

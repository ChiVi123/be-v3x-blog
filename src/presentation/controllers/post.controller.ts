import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import type { CreatePostUseCase } from '~application/use-cases/post/create-post.use-case';
import type { UserId } from '~domain/types/branded';
import { CREATE_POST_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
import { CurrentUser } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { CreatePostRequest } from '~presentation/dtos/post/post.dto';
import { JwtAuthGuard } from '~presentation/guards';

@Controller('posts')
export class PostController {
  constructor(
    @Inject(CREATE_POST_USE_CASE_TOKEN)
    private readonly createPostUseCase: CreatePostUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createPost(@Body() body: CreatePostRequest, @CurrentUser('id') userId: UserId) {
    return this.createPostUseCase.execute({ ...body, authorId: userId });
  }
}

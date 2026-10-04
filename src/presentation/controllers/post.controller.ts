import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import type { CreatePostUseCase } from '~application/use-cases/post/create-post.use-case';
import type { ListPostUseCase } from '~application/use-cases/post/list-post.use-case';
import type { UserId } from '~domain/types/branded';
import { CREATE_POST_USE_CASE_TOKEN, LIST_POST_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';
import { CurrentUser } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { CreatePostRequest, ListPostQueryDto } from '~presentation/dtos/post/post.dto';
import { JwtAuthGuard } from '~presentation/guards';

@Controller('posts')
export class PostController {
  constructor(
    @Inject(CREATE_POST_USE_CASE_TOKEN)
    private readonly createPostUseCase: CreatePostUseCase,
    @Inject(LIST_POST_USE_CASE_TOKEN)
    private readonly listPostUseCase: ListPostUseCase,
  ) {}

  @Get()
  getListPost(@Query() query: ListPostQueryDto) {
    return this.listPostUseCase.execute(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createPost(@Body() body: CreatePostRequest, @CurrentUser('id') userId: UserId) {
    return this.createPostUseCase.execute({ ...body, authorId: userId });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  CreatePostUseCase,
  DeletePostUseCase,
  GetPostDetailUseCase,
  GetPostUseCase,
  ListPostUseCase,
  QueryPostUseCase,
  UpdatePostUseCase,
} from '~application/use-cases/post';
import type { PostId, UserId } from '~domain/types/branded';
import {
  CREATE_POST_USE_CASE_TOKEN,
  DELETE_POST_USE_CASE_TOKEN,
  GET_POST_DETAIL_USE_CASE_TOKEN,
  GET_POST_USE_CASE_TOKEN,
  LIST_POST_USE_CASE_TOKEN,
  QUERY_POST_USE_CASE_TOKEN,
  UPDATE_POST_USE_CASE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { CurrentUser } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { CreatePostRequest, ListPostQueryDto, UpdatePostRequest } from '~presentation/dtos/post/post.dto';
import { JwtAuthGuard } from '~presentation/guards';

@Controller('posts')
export class PostController {
  constructor(
    @Inject(CREATE_POST_USE_CASE_TOKEN)
    private readonly createPostUseCase: CreatePostUseCase,
    @Inject(LIST_POST_USE_CASE_TOKEN)
    private readonly listPostUseCase: ListPostUseCase,
    @Inject(QUERY_POST_USE_CASE_TOKEN)
    private readonly queryPostUseCase: QueryPostUseCase,
    @Inject(GET_POST_USE_CASE_TOKEN)
    private readonly getPostUseCase: GetPostUseCase,
    @Inject(GET_POST_DETAIL_USE_CASE_TOKEN)
    private readonly getPostDetailUseCase: GetPostDetailUseCase,
    @Inject(UPDATE_POST_USE_CASE_TOKEN)
    private readonly updatePostUseCase: UpdatePostUseCase,
    @Inject(DELETE_POST_USE_CASE_TOKEN)
    private readonly deletePostUseCase: DeletePostUseCase,
  ) {}

  @Get()
  getListPost(@Query() query: ListPostQueryDto) {
    return this.listPostUseCase.execute(query);
  }

  @Get('all')
  getAllPost(@Query() query: ListPostQueryDto) {
    return this.queryPostUseCase.execute(query);
  }

  @Get(':id')
  getPostById(@Param('id', new ParseUUIDPipe()) id: PostId) {
    return this.getPostUseCase.execute(id);
  }

  @Get('detail/:slug')
  getPostBySlug(@Param('slug') slug: string) {
    return this.getPostDetailUseCase.execute(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createPost(@Body() body: CreatePostRequest, @CurrentUser('id') userId: UserId) {
    return this.createPostUseCase.execute({ ...body, authorId: userId });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updatePost(
    @Param('id', new ParseUUIDPipe()) id: PostId,
    @Body() body: UpdatePostRequest,
    @CurrentUser('id') userId: UserId,
  ) {
    return this.updatePostUseCase.execute({ id, authorId: userId, ...body });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@Param('id', new ParseUUIDPipe()) id: PostId, @CurrentUser('id') userId: UserId) {
    await this.deletePostUseCase.execute({ id, authorId: userId });
  }
}

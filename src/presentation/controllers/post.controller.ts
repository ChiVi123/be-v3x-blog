import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { PostFacade } from '~application/facades/post.facade';
import type { PostId, UserId } from '~domain/types/branded';
import { CurrentUser } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { CreatePostRequest, ListPostQueryDto, UpdatePostRequest } from '~presentation/dtos/post/post.dto';
import { JwtAuthGuard } from '~presentation/guards';

@Controller('posts')
export class PostController {
  constructor(private readonly postFacade: PostFacade) {}

  @Get()
  getListPost(@Query() query: ListPostQueryDto) {
    return this.postFacade.listPosts(query);
  }

  @Get('all')
  getAllPost(@Query() query: ListPostQueryDto) {
    return this.postFacade.queryPosts(query);
  }

  @Get(':id')
  getPostById(@Param('id', new ParseUUIDPipe()) id: PostId) {
    return this.postFacade.getPost(id);
  }

  @Get('detail/:slug')
  getPostBySlug(@Param('slug') slug: string) {
    return this.postFacade.getPostDetail(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createPost(@Body() body: CreatePostRequest, @CurrentUser('id') userId: UserId) {
    return this.postFacade.createPost({ ...body, authorId: userId });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updatePost(
    @Param('id', new ParseUUIDPipe()) id: PostId,
    @Body() body: UpdatePostRequest,
    @CurrentUser('id') userId: UserId,
  ) {
    return this.postFacade.updatePost({ id, authorId: userId, ...body });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@Param('id', new ParseUUIDPipe()) id: PostId, @CurrentUser('id') userId: UserId) {
    await this.postFacade.deletePost({ id, authorId: userId });
  }
}

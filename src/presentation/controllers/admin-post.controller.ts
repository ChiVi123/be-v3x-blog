import { Controller, Get, Query, UseGuards } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { PostFacade } from '~application/facades/post.facade';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { AdminListPostQueryDto } from '~presentation/dtos/post/admin-post.dto';
import { AdminGuard, JwtAuthGuard } from '~presentation/guards';

@Controller('admin/posts')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPostController {
  constructor(private readonly postFacade: PostFacade) {}

  @Get()
  list(@Query() query: AdminListPostQueryDto) {
    return this.postFacade.listAllPosts(query);
  }
}

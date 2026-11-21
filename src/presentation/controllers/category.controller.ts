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
  UseGuards,
} from '@nestjs/common';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { CategoryFacade } from '~application/facades/category.facade';
import type { CategoryId } from '~domain/types/branded';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { CategoryBodyDto } from '~presentation/dtos/category.dto';
import { AdminGuard, JwtAuthGuard } from '~presentation/guards';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryFacade: CategoryFacade) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.categoryFacade.getAllPublic();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CategoryBodyDto) {
    return this.categoryFacade.createCategory({ name: body.name });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  update(@Param('id', new ParseUUIDPipe()) id: CategoryId, @Body() body: CategoryBodyDto) {
    return this.categoryFacade.updateCategory({ id, name: body.name });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: CategoryId) {
    await this.categoryFacade.deleteCategory(id);
  }
}

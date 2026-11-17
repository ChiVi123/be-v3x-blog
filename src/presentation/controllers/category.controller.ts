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
import { Role } from '~domain/entities/user.entity';
import type { CategoryId } from '~domain/types/branded';
import { Roles } from '~presentation/decorators';
// biome-ignore lint/style/useImportType: DTO class is required for NestJS ValidationPipe metadata reflection
import { CategoryBodyDto } from '~presentation/dtos/category.dto';
import { JwtAuthGuard, RolesGuard } from '~presentation/guards';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryFacade: CategoryFacade) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.categoryFacade.getAllPublic();
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CategoryBodyDto) {
    return this.categoryFacade.createCategory({ name: body.name });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  update(@Param('id', new ParseUUIDPipe()) id: CategoryId, @Body() body: CategoryBodyDto) {
    return this.categoryFacade.updateCategory({ id, name: body.name });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: CategoryId) {
    await this.categoryFacade.deleteCategory(id);
  }
}

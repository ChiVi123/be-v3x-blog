import { Controller, Get, HttpCode } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { CategoryFacade } from '~application/facades/category.facade';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryFacade: CategoryFacade) {}

  @Get()
  @HttpCode(200)
  async findAll() {
    return this.categoryFacade.getAllPublic();
  }
}

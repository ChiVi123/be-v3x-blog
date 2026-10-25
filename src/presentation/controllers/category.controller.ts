import { Controller, Get, HttpCode, Inject } from '@nestjs/common';
import type { GetAllCategoryPublicUseCase } from '~application/use-cases/category';
import { GET_ALL_CATEGORY_PUBLIC_USE_CASE_TOKEN } from '~infrastructure/config/provider-tokens';

@Controller('categories')
export class CategoryController {
  constructor(
    @Inject(GET_ALL_CATEGORY_PUBLIC_USE_CASE_TOKEN)
    private readonly getAllCategoryPublicUseCase: GetAllCategoryPublicUseCase,
  ) {}

  @Get()
  @HttpCode(200)
  async findAll() {
    return this.getAllCategoryPublicUseCase.execute();
  }
}

import { Module } from '@nestjs/common';
import type { CategoryRepository } from '~application/repositories/category.repository';
import { GetAllCategoryPublicUseCase } from '~application/use-cases/category';
import {
  CATEGORY_REPOSITORY_TOKEN,
  GET_ALL_CATEGORY_PUBLIC_USE_CASE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { CategoryController } from '~presentation/controllers/category.controller';

@Module({
  providers: [
    {
      provide: GET_ALL_CATEGORY_PUBLIC_USE_CASE_TOKEN,
      useFactory: (categoryRepo: CategoryRepository) => {
        return new GetAllCategoryPublicUseCase(categoryRepo);
      },
      inject: [CATEGORY_REPOSITORY_TOKEN],
    },
  ],
  controllers: [CategoryController],
})
export class CategoryModule {}

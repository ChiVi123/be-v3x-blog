import { Module } from '@nestjs/common';
import { CategoryFacade } from '~application/facades/category.facade';
import type { CategoryRepository } from '~application/repositories/category.repository';
import { CATEGORY_REPOSITORY_TOKEN } from '~infrastructure/config/provider-tokens';
import { CategoryController } from '~presentation/controllers/category.controller';

@Module({
  providers: [
    {
      provide: CategoryFacade,
      useFactory: (categoryRepo: CategoryRepository) => new CategoryFacade(categoryRepo),
      inject: [CATEGORY_REPOSITORY_TOKEN],
    },
  ],
  controllers: [CategoryController],
})
export class CategoryModule {}

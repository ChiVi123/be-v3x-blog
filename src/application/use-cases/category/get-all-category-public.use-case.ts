import type { CategoryRepository } from '~application/repositories/category.repository';

export class GetAllCategoryPublicUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  async execute() {
    const categories = await this.repository.findAll();

    return {
      data: categories,
    };
  }
}

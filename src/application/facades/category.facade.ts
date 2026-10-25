import type { CategoryRepository } from '~application/repositories/category.repository';

export class CategoryFacade {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async getAllPublic() {
    const categories = await this.categoryRepository.findAll();
    return { data: categories };
  }
}

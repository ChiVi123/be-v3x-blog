import type { CategoryRepository } from '~application/repositories/category.repository';
import type { PostRepository } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import { ConflictException, EntityNotFoundException } from '~domain/exceptions';
import type { CategoryId } from '~domain/types/branded';

export type CreateCategoryParams = { name: string };

export type UpdateCategoryParams = { id: CategoryId; name: string };

export class CategoryFacade {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly postRepository: PostRepository,
    private readonly transformService: TransformService,
  ) {}

  // --- Queries ---

  async getAllPublic() {
    const categories = await this.categoryRepository.findAll();
    return { data: categories };
  }

  // --- Commands (admin) ---

  async createCategory({ name }: CreateCategoryParams) {
    const slug = this.transformService.slugify(name);
    await this.assertSlugAvailable(slug);

    return this.categoryRepository.create({ name, slug });
  }

  async updateCategory({ id, name }: UpdateCategoryParams) {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new EntityNotFoundException('Category', id);
    }

    const slug = this.transformService.slugify(name);
    await this.assertSlugAvailable(slug, id);

    return this.categoryRepository.update(id, { name, slug });
  }

  async deleteCategory(id: CategoryId): Promise<void> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new EntityNotFoundException('Category', id);
    }

    // posts.categoryId có onDelete: 'cascade', xóa chuyên mục sẽ xóa luôn toàn bộ bài viết bên trong.
    const postsCount = await this.postRepository.count({ page: 1, limit: 1, category: id });
    if (postsCount > 0) {
      throw new ConflictException('Cannot delete a category that still has posts');
    }

    await this.categoryRepository.delete(id);
  }

  private async assertSlugAvailable(slug: string, exceptId?: CategoryId): Promise<void> {
    const found = await this.categoryRepository.findBySlug(slug);
    if (found && found.id !== exceptId) {
      throw new ConflictException('Category already exists');
    }
  }
}

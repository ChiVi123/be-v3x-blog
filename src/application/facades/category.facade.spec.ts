import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { CategoryDetail, CategoryRepository } from '~application/repositories/category.repository';
import type { PostRepository } from '~application/repositories/post.repository';
import type { TransformService } from '~application/services/transform.service';
import { ConflictException, EntityNotFoundException } from '~domain/exceptions';
import type { CategoryId } from '~domain/types/branded';
import { CategoryFacade } from './category.facade';

describe('CategoryFacade', () => {
  let facade: CategoryFacade;
  let mockCategoryRepository: {
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    findById: ReturnType<typeof mock>;
    findBySlug: ReturnType<typeof mock>;
    findAll: ReturnType<typeof mock>;
  };
  let mockPostRepository: { count: ReturnType<typeof mock> };
  let mockTransformService: { slugify: ReturnType<typeof mock> };

  const categoryId = 'category-1' as CategoryId;
  const category: CategoryDetail = {
    id: categoryId,
    name: 'Tech',
    slug: 'tech',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockCategoryRepository = {
      create: mock(async (input: unknown) => ({ ...category, ...(input as object) })),
      update: mock(async (_id: CategoryId, input: unknown) => ({ ...category, ...(input as object) })),
      delete: mock(async () => undefined),
      findById: mock(async () => category),
      findBySlug: mock(async () => null),
      findAll: mock(async () => [{ id: categoryId, name: 'Tech', postsCount: 2 }]),
    };

    mockPostRepository = { count: mock(async () => 0) };

    mockTransformService = {
      slugify: mock((text: string) => text.toLowerCase().replace(/\s+/g, '-')),
    };

    facade = new CategoryFacade(
      mockCategoryRepository as unknown as CategoryRepository,
      mockPostRepository as unknown as PostRepository,
      mockTransformService as unknown as TransformService,
    );
  });

  describe('getAllPublic', () => {
    it('returns all categories wrapped in data', async () => {
      const result = await facade.getAllPublic();

      expect(result).toEqual({ data: [{ id: categoryId, name: 'Tech', postsCount: 2 }] });
    });
  });

  describe('createCategory', () => {
    it('slugifies the name and creates the category', async () => {
      const result = await facade.createCategory({ name: 'Life Style' });

      expect(mockTransformService.slugify).toHaveBeenCalledWith('Life Style');
      expect(mockCategoryRepository.create).toHaveBeenCalledWith({ name: 'Life Style', slug: 'life-style' });
      expect(result.slug).toBe('life-style');
    });

    it('throws ConflictException when the slug is already used', async () => {
      mockCategoryRepository.findBySlug = mock(async () => category);

      await expect(facade.createCategory({ name: 'Tech' })).rejects.toThrow(ConflictException);
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('updates the name and regenerates the slug', async () => {
      const result = await facade.updateCategory({ id: categoryId, name: 'Technology' });

      expect(mockCategoryRepository.update).toHaveBeenCalledWith(categoryId, {
        name: 'Technology',
        slug: 'technology',
      });
      expect(result.slug).toBe('technology');
    });

    it('throws EntityNotFoundException when the category does not exist', async () => {
      mockCategoryRepository.findById = mock(async () => null);

      await expect(facade.updateCategory({ id: categoryId, name: 'Technology' })).rejects.toThrow(
        EntityNotFoundException,
      );
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when another category already uses the slug', async () => {
      mockCategoryRepository.findBySlug = mock(async () => ({ ...category, id: 'category-2' as CategoryId }));

      await expect(facade.updateCategory({ id: categoryId, name: 'Technology' })).rejects.toThrow(ConflictException);
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it('allows keeping the same slug for the same category (e.g. changing letter case)', async () => {
      mockCategoryRepository.findBySlug = mock(async () => category);

      await facade.updateCategory({ id: categoryId, name: 'TECH' });

      expect(mockCategoryRepository.update).toHaveBeenCalledWith(categoryId, { name: 'TECH', slug: 'tech' });
    });
  });

  describe('deleteCategory', () => {
    it('deletes an empty category', async () => {
      await facade.deleteCategory(categoryId);

      expect(mockPostRepository.count).toHaveBeenCalledWith({ page: 1, limit: 1, category: categoryId });
      expect(mockCategoryRepository.delete).toHaveBeenCalledWith(categoryId);
    });

    it('throws EntityNotFoundException when the category does not exist', async () => {
      mockCategoryRepository.findById = mock(async () => null);

      await expect(facade.deleteCategory(categoryId)).rejects.toThrow(EntityNotFoundException);
      expect(mockCategoryRepository.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException and keeps the category when it still has posts', async () => {
      mockPostRepository.count = mock(async () => 3);

      await expect(facade.deleteCategory(categoryId)).rejects.toThrow(ConflictException);
      expect(mockCategoryRepository.delete).not.toHaveBeenCalled();
    });
  });
});

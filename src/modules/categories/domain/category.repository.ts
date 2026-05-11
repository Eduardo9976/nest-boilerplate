import type { Category } from './category.entity';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export type CategoryId = Category['id'];

export type FindOneCategoryFilters = { id: CategoryId } | { name: Category['name'] };

export type FindByCategoryFilters = Partial<Pick<Category, 'id' | 'name' | 'isActive'>>;

export type CategoryData = Pick<Category, 'name' | 'description' | 'isActive'>;

export type UpdateCategoryInput = Partial<CategoryData> & { id: CategoryId };

export interface CategoryRepository {
  findOne(filter: FindOneCategoryFilters): Promise<Category | null>;
  findBy(filter: FindByCategoryFilters): Promise<Category[]>;
  create(data: CategoryData): Promise<Category>;
  update(input: UpdateCategoryInput): Promise<Category>;
  delete(id: CategoryId): Promise<void>;
}

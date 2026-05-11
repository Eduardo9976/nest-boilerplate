import type { Category } from '../domain/category.entity';
import type { CategoryResponseDto } from './dtos/category-response.dto';

export class CategoriesMapper {
  static toResponse(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    } as CategoryResponseDto;
  }

  static toResponseList(categories: Category[]): CategoryResponseDto[] {
    return categories.map((c) => CategoriesMapper.toResponse(c));
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  FindByCategoryFilters,
  CategoryRepository,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';

@Injectable()
export class FindCategoryByUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  execute(filter: FindByCategoryFilters): Promise<Category[]> {
    return this.categoryRepository.findBy(filter);
  }
}

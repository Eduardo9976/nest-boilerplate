import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  FindOneCategoryFilters,
  CategoryRepository,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

@Injectable()
export class FindOneCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(filter: FindOneCategoryFilters): Promise<Category> {
    const category = await this.categoryRepository.findOne(filter);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}

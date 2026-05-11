import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryData,
  CategoryRepository,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: CategoryData): Promise<Category> {
    const name = input.name.trim().toLowerCase();

    const existing = await this.categoryRepository.findOne({ name });
    if (existing) throw new ConflictException('Category already exists');

    return this.categoryRepository.create({ ...input, name });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
  UpdateCategoryInput,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.categoryRepository.findOne({ id: input.id });
    if (!existing) throw new NotFoundException('Category not found');

    const data: UpdateCategoryInput = { id: input.id };

    if (input.name !== undefined) {
      const name = input.name.trim().toLowerCase();
      const conflict = await this.categoryRepository.findOne({ name });
      if (conflict && conflict.id !== input.id) {
        throw new ConflictException('Category name already exists');
      }
      data.name = name;
    }

    if (input.description !== undefined) data.description = input.description;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return this.categoryRepository.update(data);
  }
}

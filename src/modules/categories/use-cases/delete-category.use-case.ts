import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryId,
  CategoryRepository,
} from '../domain/category.repository';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(id: CategoryId): Promise<void> {
    const existing = await this.categoryRepository.findOne({ id });
    if (!existing) throw new NotFoundException('Category not found');
    await this.categoryRepository.delete(id);
  }
}

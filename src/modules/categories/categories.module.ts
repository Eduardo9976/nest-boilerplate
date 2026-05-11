import { Module } from '@nestjs/common';
import { CategoriesController } from './presentation/categories.controller';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { FindOneCategoryUseCase } from './use-cases/find-one-category.use-case';
import { FindCategoryByUseCase } from './use-cases/find-category-by.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './use-cases/delete-category.use-case';
import { CATEGORY_REPOSITORY } from './domain/category.repository';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';

@Module({
  controllers: [CategoriesController],
  providers: [
    CreateCategoryUseCase,
    FindOneCategoryUseCase,
    FindCategoryByUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
  ],
  exports: [FindOneCategoryUseCase],
})
export class CategoriesModule {}

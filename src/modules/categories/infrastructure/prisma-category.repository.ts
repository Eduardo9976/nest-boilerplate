import { Injectable } from '@nestjs/common';
import {
  CategoryId,
  CategoryRepository,
  CategoryData,
  FindByCategoryFilters,
  FindOneCategoryFilters,
  UpdateCategoryInput,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(filter: FindOneCategoryFilters): Promise<Category | null> {
    const record = await this.prisma.category.findFirst({ where: filter });
    return record ? this.toEntity(record as Category) : null;
  }

  async findBy(filters: FindByCategoryFilters): Promise<Category[]> {
    const records = await this.prisma.category.findMany({ where: filters });
    return records.map((r) => this.toEntity(r as Category));
  }

  async create(data: CategoryData): Promise<Category> {
    const record = await this.prisma.category.create({ data });
    return this.toEntity(record as Category);
  }

  async update(input: UpdateCategoryInput): Promise<Category> {
    const { id, ...data } = input;
    const record = await this.prisma.category.update({ where: { id }, data });
    return this.toEntity(record as Category);
  }

  async delete(id: CategoryId): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  private toEntity(record: Category): Category {
    return record;
  }
}

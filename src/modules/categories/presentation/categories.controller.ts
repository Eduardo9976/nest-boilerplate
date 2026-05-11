import { z } from 'zod';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateCategoryDto, CreateCategorySchema } from './dtos/create-category.dto';
import { UpdateCategoryDto, UpdateCategorySchema } from './dtos/update-category.dto';
import { FindOneCategoryDto, FindOneCategorySchema } from './dtos/find-one-category.dto';
import { FindCategoryDto, FindCategorySchema } from './dtos/find-category.dto';
import { CategoryResponseDto } from './dtos/category-response.dto';
import { ErrorResponseDto } from '../../../shared/dtos/error-response.dto';
import { CreateCategoryUseCase } from '../use-cases/create-category.use-case';
import { FindOneCategoryUseCase } from '../use-cases/find-one-category.use-case';
import { FindCategoryByUseCase } from '../use-cases/find-category-by.use-case';
import { UpdateCategoryUseCase } from '../use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from '../use-cases/delete-category.use-case';
import { CategoriesMapper } from './categories.mapper';

const IdParamSchema = z.object({ id: z.string().uuid() });

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategory: CreateCategoryUseCase,
    private readonly findOneCategory: FindOneCategoryUseCase,
    private readonly findCategoryBy: FindCategoryByUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova categoria' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Categoria criada', type: CategoryResponseDto })
  @ApiResponse({ status: 409, description: 'Nome já cadastrado', type: ErrorResponseDto })
  async create(
    @Body(new ZodValidationPipe(CreateCategorySchema)) dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.createCategory.execute({
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });
    return CategoriesMapper.toResponse(category);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar categorias com filtros' })
  @ApiResponse({ status: 200, description: 'Lista de categorias', type: [CategoryResponseDto] })
  async findBy(
    @Query(new ZodValidationPipe(FindCategorySchema)) query: FindCategoryDto,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.findCategoryBy.execute(query);
    return CategoriesMapper.toResponseList(categories);
  }

  @Public()
  @Get(':identifier')
  @ApiOperation({ summary: 'Buscar categoria por ID ou nome' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ErrorResponseDto })
  async findOne(
    @Param(new ZodValidationPipe(FindOneCategorySchema)) params: FindOneCategoryDto,
  ): Promise<CategoryResponseDto> {
    const { identifier } = params;
    const isUuid = z.string().uuid().safeParse(identifier).success;
    const filter = isUuid ? { id: identifier } : { name: identifier };

    const category = await this.findOneCategory.execute(filter);
    return CategoriesMapper.toResponse(category);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: 'Categoria atualizada', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Nome já em uso', type: ErrorResponseDto })
  async update(
    @Param(new ZodValidationPipe(IdParamSchema)) { id }: { id: string },
    @Body(new ZodValidationPipe(UpdateCategorySchema)) dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.updateCategory.execute({ id, ...dto });
    return CategoriesMapper.toResponse(category);
  }

  @Public()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar categoria (cascade: deleta services vinculados)' })
  @ApiResponse({ status: 204, description: 'Categoria deletada' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ErrorResponseDto })
  async delete(@Param(new ZodValidationPipe(IdParamSchema)) { id }: { id: string }): Promise<void> {
    await this.deleteCategory.execute(id);
  }
}

import { z } from 'zod';
import {Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query} from '@nestjs/common';
import {ApiBody, ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import {Public} from '../../../shared/decorators/public.decorator';
import {ZodValidationPipe} from '../../../shared/pipes/zod-validation.pipe';
import {CreateServiceDto, CreateServiceSchema} from './dtos/create-service.dto';
import {ServiceResponseDto} from './dtos/service-response.dto';
import {ErrorResponseDto} from '../../../shared/dtos/error-response.dto';
import {CreateServiceUseCase} from "../use-cases/create-service.use-case";
import {FindOneServiceUseCase} from "../use-cases/find-one-service.use-case";
import {FindServiceByUseCase} from "../use-cases/find-service-by.use-case";
import {ServicesMapper} from "./services.mapper";
import {FindServiceDto, FindServiceSchema} from "./dtos/find-service.dto";
import {FindOneServiceDto, FindOneServiceSchema} from "./dtos/find-one-service.dto";

@ApiTags('services')
@Controller('services')
export class ServicesController {
    constructor(
        private readonly createService: CreateServiceUseCase,
        private readonly findOneService: FindOneServiceUseCase,
        private readonly findServiceBy: FindServiceByUseCase,
    ) {
    }

    @Public()
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({summary: 'Criar novo serviço'})
    @ApiBody({
        type: CreateServiceDto,
        examples: {
            valido: {
                value: {
                    name: 'corte',
                    description: 'corte de cabelo',
                    durationInMinutes: 30,
                    price: 50.00,
                    category: 'cabelo'
                }
            },
        },
    })
    @ApiResponse({status: 201, description: 'Serviço criado', type: ServiceResponseDto})
    @ApiResponse({status: 400, description: 'Dados inválidos', type: ErrorResponseDto})
    @ApiResponse({status: 409, description: 'Nome já cadastrado', type: ErrorResponseDto})
    async create(
        @Body(new ZodValidationPipe(CreateServiceSchema)) dto: CreateServiceDto,
    ): Promise<ServiceResponseDto> {
        const service = await this.createService.execute({
            name: dto.name,
            description: dto.description,
            durationInMinutes: dto.durationInMinutes,
            price: dto.price,
            category: dto.category,
            isActive: dto.isActive,
            imageUrl: dto.imageUrl
        });
        return ServicesMapper.toResponse(service);
    }

    @Public()
    @Get(':identifier')
    @ApiOperation({summary: 'Buscar serviço por ID ou Nome'})
    @ApiResponse({status: 200, description: 'Serviço encontrado', type: ServiceResponseDto})
    @ApiResponse({status: 404, description: 'Serviço não encontrado', type: ErrorResponseDto})
    async findOne(
        @Param(new ZodValidationPipe(FindOneServiceSchema)) params: FindOneServiceDto
    ): Promise<ServiceResponseDto | null> {
        const { identifier } = params;
        const isUuid = z.string().uuid().safeParse(identifier).success;
        const filter = isUuid ? {id: identifier} : {name: identifier};

        const service = await this.findOneService.execute(filter);
        return service ? ServicesMapper.toResponse(service) : null;
    }

    @Public()
    @Get()
    @ApiOperation({summary: 'Listar serviços com filtros'})
    @ApiResponse({status: 200, description: 'Lista de serviços', type: [ServiceResponseDto]})
    async findBy(
        @Query(new ZodValidationPipe(FindServiceSchema)) query: FindServiceDto,
    ): Promise<ServiceResponseDto[]> {
        const services = await this.findServiceBy.execute(query);
        return services ? ServicesMapper.toResponseList(services) : [];
    }
}

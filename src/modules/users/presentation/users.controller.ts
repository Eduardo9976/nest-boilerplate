import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { CreateUserSchema, CreateUserDto } from './dtos/create-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { ErrorResponseDto } from '../../../shared/dtos/error-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly createUser: CreateUserUseCase) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo usuário' })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      valido: { value: { email: 'novo@example.com', password: 'senha1234' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Usuário criado', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado', type: ErrorResponseDto })
  async create(
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.createUser.execute({
      email: dto.email,
      password: dto.password,
    });
    return {
      id: user.id,
      email: user.email.toString(),
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

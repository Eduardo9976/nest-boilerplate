import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { JwtLoginUseCase } from '../use-cases/jwt-login.use-case';
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case';
import {
  IRedisTokenRepository,
  REDIS_TOKEN_REPOSITORY,
} from '../infrastructure/redis-token.repository';
import { LoginSchema, LoginDto } from './dtos/login.dto';
import { TokenPairDto } from './dtos/token-pair.dto';
import { ErrorResponseDto } from '../../../shared/dtos/error-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtLoginUseCase: JwtLoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    @Inject(REDIS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IRedisTokenRepository,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com e-mail e senha' })
  @ApiBody({
    type: LoginDto,
    examples: {
      valido: { value: { email: 'usuario@example.com', password: 'senha123' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Tokens gerados', type: TokenPairDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais incorretas', type: ErrorResponseDto })
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto): Promise<TokenPairDto> {
    return this.jwtLoginUseCase.execute(dto.email, dto.password);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Renovar par de tokens',
    description: 'Envia o **refresh token** no header `Authorization: Bearer <refresh_token>`',
  })
  @ApiResponse({ status: 200, description: 'Novo par de tokens', type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado', type: ErrorResponseDto })
  refresh(@Request() req: { user: { userId: string; tokenId: string } }): Promise<TokenPairDto> {
    return this.refreshTokenUseCase.execute(req.user.userId, req.user.tokenId);
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — invalida todos os tokens do usuário' })
  @ApiResponse({ status: 204, description: 'Logout realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ErrorResponseDto })
  async logout(@Request() req: { user: { userId: string } }): Promise<void> {
    await this.tokenRepo.deleteAll(req.user.userId);
  }
}

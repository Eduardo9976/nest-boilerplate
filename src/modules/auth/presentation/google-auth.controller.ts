import { Controller, Get, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../../shared/decorators/public.decorator';
import { GoogleLoginUseCase } from '../use-cases/google-login.use-case';
import { TokenPairDto } from './dtos/token-pair.dto';
import { ErrorResponseDto } from '../../../shared/dtos/error-response.dto';

@ApiTags('auth')
@Controller('auth')
export class GoogleAuthController {
  constructor(private readonly googleLoginUseCase: GoogleLoginUseCase) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Iniciar autenticação via Google OAuth 2.0',
    description:
      'Redireciona o browser para a tela de login do Google. Não pode ser testado diretamente pelo Swagger UI.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect para o Google',
    headers: {
      Location: {
        description: 'URL da página de autenticação do Google',
        schema: { type: 'string', example: 'https://accounts.google.com/o/oauth2/...' },
      },
    },
  })
  googleAuth(): void {
    // Passport redirects to Google — no body needed
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Callback OAuth do Google',
    description:
      'Endpoint chamado automaticamente pelo Google após autenticação. Retorna os tokens JWT.',
  })
  @ApiResponse({ status: 200, description: 'Autenticação bem-sucedida', type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Falha na autenticação OAuth', type: ErrorResponseDto })
  async googleCallback(
    @Request() req: { user: { googleId: string; email: string } },
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.googleLoginUseCase.execute(req.user);
    res.json(tokens);
  }
}

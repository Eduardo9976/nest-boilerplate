import { RefreshTokenUseCase } from './refresh-token.use-case';
import type { TokenIssuerService } from './token-issuer.service';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  const mockTokenRepo = {
    store: jest.fn(),
    verify: jest.fn(),
    delete: jest.fn(),
    deleteAll: jest.fn(),
  };
  const mockTokenIssuer = { issueTokenPair: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RefreshTokenUseCase(
      mockTokenRepo,
      mockTokenIssuer as unknown as TokenIssuerService,
    );
  });

  it('returns new token pair and deletes old token when valid', async () => {
    mockTokenRepo.verify.mockResolvedValue(true);
    mockTokenIssuer.issueTokenPair.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    const result = await useCase.execute('user-1', 'token-1');

    expect(mockTokenRepo.delete).toHaveBeenCalledWith('user-1', 'token-1');
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
  });

  it('throws UnauthorizedException when token not found in Redis', async () => {
    mockTokenRepo.verify.mockResolvedValue(false);

    await expect(useCase.execute('user-1', 'token-1')).rejects.toThrow(UnauthorizedException);
    expect(mockTokenRepo.delete).not.toHaveBeenCalled();
  });
});

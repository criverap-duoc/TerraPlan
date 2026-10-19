import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { argon2id, hash } from 'argon2';
import { AppUser } from '../users/entities/app-user.entity';
import { UsersService } from '../users/users.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { Role } from './types/role.enum';

const ACCESS_SECRET = 'test-access-secret-long-enough-for-hs256';
const REFRESH_SECRET = 'test-refresh-secret-long-enough-for-hs256';

const CONFIG_VALUES: Record<string, string> = {
  JWT_ACCESS_SECRET: ACCESS_SECRET,
  JWT_REFRESH_SECRET: REFRESH_SECRET,
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
};

interface UsersMock {
  findByEmail: jest.Mock;
  findById: jest.Mock;
}

interface RefreshTokensMock {
  createRefreshToken: jest.Mock;
  findActiveByHash: jest.Mock;
  revokeById: jest.Mock;
}

describe('AuthService', () => {
  let service: AuthService;
  let users: UsersMock;
  let refreshTokens: RefreshTokensMock;
  let jwtService: JwtService;
  let user: AppUser;

  beforeAll(async () => {
    user = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'coordinator@terraplan.local',
      passwordHash: await hash('Coord1234!', { type: argon2id }),
      fullName: 'Coordinador Demo',
      role: Role.Coordinator,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    refreshTokens = {
      createRefreshToken: jest.fn(),
      findActiveByHash: jest.fn(),
      revokeById: jest.fn(),
    };
    jwtService = new JwtService({
      secret: ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    });

    const configService = {
      getOrThrow: (key: string): string => CONFIG_VALUES[key],
    };

    service = new AuthService(
      configService as unknown as ConfigService,
      jwtService,
      users as unknown as UsersService,
      refreshTokens as unknown as AuthRepository,
    );
  });

  it('returns an access and refresh token pair for valid credentials', async () => {
    users.findByEmail.mockResolvedValue(user);
    refreshTokens.createRefreshToken.mockResolvedValue({});

    const result = await service.login(user.email, 'Coord1234!');

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.tokenType).toBe('Bearer');
    expect(result.accessExpiresIn).toBe('15m');
    expect(result.refreshExpiresIn).toBe('7d');
    expect(refreshTokens.createRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('rejects a login with the wrong password', async () => {
    users.findByEmail.mockResolvedValue(user);

    await expect(service.login(user.email, 'WrongPassword1!')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokens.createRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects a login for an inactive user', async () => {
    const inactiveUser = Object.assign(new AppUser(), user, { isActive: false });
    users.findByEmail.mockResolvedValue(inactiveUser);

    await expect(service.login(user.email, 'Coord1234!')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokens.createRefreshToken).not.toHaveBeenCalled();
  });

  it('rotates the refresh token and revokes the presented one', async () => {
    users.findByEmail.mockResolvedValue(user);
    users.findById.mockResolvedValue(user);
    refreshTokens.createRefreshToken.mockResolvedValue({});
    refreshTokens.findActiveByHash.mockResolvedValue({ id: 'stored-token-id' });

    const initialPair = await service.login(user.email, 'Coord1234!');
    const rotatedPair = await service.refresh(initialPair.refreshToken);

    expect(refreshTokens.revokeById).toHaveBeenCalledWith('stored-token-id');
    expect(refreshTokens.createRefreshToken).toHaveBeenCalledTimes(2);
    expect(rotatedPair.refreshToken).not.toBe(initialPair.refreshToken);
  });

  it('rejects a refresh token that is no longer active', async () => {
    refreshTokens.findActiveByHash.mockResolvedValue(null);
    const refreshToken = await signRefreshToken(jwtService, user);

    await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    expect(refreshTokens.revokeById).not.toHaveBeenCalled();
  });

  it('rejects an expired refresh token', async () => {
    refreshTokens.findActiveByHash.mockResolvedValue({ id: 'stored-token-id' });
    const expiredToken = jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, typ: 'refresh' },
      { secret: REFRESH_SECRET, expiresIn: -10 },
    );

    await expect(service.refresh(expiredToken)).rejects.toThrow(UnauthorizedException);
  });

  it('revokes the refresh token on logout', async () => {
    refreshTokens.findActiveByHash.mockResolvedValue({ id: 'stored-token-id' });

    await service.logout('some-refresh-token');

    expect(refreshTokens.revokeById).toHaveBeenCalledWith('stored-token-id');
  });

  it('treats logout as idempotent when the token was already revoked', async () => {
    refreshTokens.findActiveByHash.mockResolvedValue(null);

    await expect(service.logout('some-refresh-token')).resolves.toBeUndefined();
    expect(refreshTokens.revokeById).not.toHaveBeenCalled();
  });

  it('rejects a refresh token presented as an access token', async () => {
    await expect(
      service.validateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        typ: 'refresh',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

function signRefreshToken(jwtService: JwtService, user: AppUser): Promise<string> {
  return jwtService.signAsync(
    { sub: user.id, email: user.email, role: user.role, typ: 'refresh' },
    { secret: REFRESH_SECRET, expiresIn: '7d' },
  );
}


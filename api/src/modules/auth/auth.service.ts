import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { verify } from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { AppUser } from '../users/entities/app-user.entity';
import { UsersService } from '../users/users.service';
import { AuthRepository } from './auth.repository';
import { TokenPairDto } from './dto/token-pair.dto';
import { AuthenticatedUser, JwtTokenPayload } from './types/auth.types';

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';
const INVALID_SESSION = 'Tu sesión expiró. Ingresa nuevamente.';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
  ) {
    this.accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessTtl = this.configService.getOrThrow<string>('JWT_ACCESS_TTL');
    this.refreshTtl = this.configService.getOrThrow<string>('JWT_REFRESH_TTL');
  }

  async login(email: string, password: string): Promise<TokenPairDto> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const isPasswordValid = await verify(user.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<TokenPairDto> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const storedToken = await this.authRepository.findActiveByHash(hashToken(refreshToken));

    if (!storedToken) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    // Rotation: a refresh token is single use, so reuse after rotation is rejected.
    await this.authRepository.revokeById(storedToken.id);

    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const storedToken = await this.authRepository.findActiveByHash(hashToken(refreshToken));

    if (storedToken) {
      await this.authRepository.revokeById(storedToken.id);
    }
  }

  async validateAccessToken(payload: JwtTokenPayload): Promise<AuthenticatedUser> {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private async issueTokenPair(user: AppUser): Promise<TokenPairDto> {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);
    const decodedRefreshToken = this.jwtService.decode<{ exp: number }>(refreshToken);

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decodedRefreshToken.exp * 1000),
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: this.accessTtl,
      refreshExpiresIn: this.refreshTtl,
      tokenType: 'Bearer',
    };
  }

  private signAccessToken(user: AppUser): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        typ: 'access',
      } satisfies JwtTokenPayload,
      {
        secret: this.accessSecret,
        expiresIn: this.accessTtl as JwtSignOptions['expiresIn'],
      },
    );
  }

  private signRefreshToken(user: AppUser): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        typ: 'refresh',
        jti: randomUUID(),
      } satisfies JwtTokenPayload,
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl as JwtSignOptions['expiresIn'],
      },
    );
  }

  private async verifyRefreshToken(token: string): Promise<JwtTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtTokenPayload>(token, {
        secret: this.refreshSecret,
      });

      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException(INVALID_SESSION);
      }

      return payload;
    } catch {
      throw new UnauthorizedException(INVALID_SESSION);
    }
  }
}

import { ApiProperty } from '@nestjs/swagger';

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived access token (JWT)' })
  accessToken!: string;

  @ApiProperty({ description: 'Single-use refresh token (JWT)' })
  refreshToken!: string;

  @ApiProperty({ example: '15m' })
  accessExpiresIn!: string;

  @ApiProperty({ example: '7d' })
  refreshExpiresIn!: string;

  @ApiProperty({ example: 'Bearer', enum: ['Bearer'] })
  tokenType!: 'Bearer';
}

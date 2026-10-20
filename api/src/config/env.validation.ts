import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

const TTL_PATTERN = /^\d+[smhd]$/;
const DURATION_MESSAGE = 'must be a duration such as 15m, 1h or 7d';

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV!: NodeEnvironment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  // Requests per minute per IP. Optional so load tests can raise it without touching production.
  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLER_LIMIT?: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  MONGO_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @Matches(TTL_PATTERN, { message: `JWT_ACCESS_TTL ${DURATION_MESSAGE}` })
  JWT_ACCESS_TTL!: string;

  @Matches(TTL_PATTERN, { message: `JWT_REFRESH_TTL ${DURATION_MESSAGE}` })
  JWT_REFRESH_TTL!: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS!: string;

  @IsUrl({ require_tld: false })
  AQUAMETRIC_URL!: string;

  @IsString()
  @IsNotEmpty()
  AQUAMETRIC_API_KEY!: string;

  // Concrete provider names are introduced with the weather module.
  @IsString()
  @IsNotEmpty()
  WEATHER_PROVIDER!: string;

  @IsUrl({ require_tld: false })
  OPEN_METEO_BASE_URL!: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors.flatMap((error) => Object.values(error.constraints ?? {})).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return validatedConfig;
}

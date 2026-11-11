import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  INTERNAL_API_KEY!: string;

  @IsString()
  CLIENTIFY_BASE_URL!: string;

  @IsString()
  CLIENTIFY_TOKEN!: string;

  @IsOptional()
  @IsString()
  CLIENTIFY_V1_BASE_URL?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  CLIENTIFY_TIMEOUT?: number;

  @IsOptional()
  @IsIn(['v1', 'v2'])
  CLIENTIFY_DEFAULT_VERSION?: 'v1' | 'v2';

  @IsOptional()
  @IsBoolean()
  CLIENTIFY_SYNC_ENABLED?: boolean;

  @IsOptional()
  @IsBoolean()
  CLIENTIFY_SYNC_CRON_ENABLED?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  CLIENTIFY_SYNC_PAGE_SIZE?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  CLIENTIFY_SYNC_PAGE_DELAY_MS?: number;

  @IsOptional()
  @IsString()
  SQL_SERVER_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  SQL_SERVER_PORT?: number;

  @IsOptional()
  @IsString()
  SQL_SERVER_USER?: string;

  @IsOptional()
  @IsString()
  SQL_SERVER_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SQL_SERVER_DATABASE?: string;

  @IsOptional()
  @IsBoolean()
  SQL_SERVER_ENCRYPT?: boolean;

  @IsOptional()
  @IsBoolean()
  SQL_SERVER_TRUST_SERVER_CERTIFICATE?: boolean;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

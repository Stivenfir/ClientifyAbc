import { plainToInstance } from 'class-transformer';
import {
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
  @IsInt()
  @Min(1000)
  @Max(60000)
  CLIENTIFY_TIMEOUT?: number;

  @IsOptional()
  @IsIn(['v1', 'v2'])
  CLIENTIFY_DEFAULT_VERSION?: 'v1' | 'v2';
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

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class OpportunityFilterDto {
  @ApiPropertyOptional({
    example: 'mudanzas',
    description: 'Texto a buscar en pipeline del deal',
    default: 'mudanzas',
  })
  @IsOptional()
  @IsString()
  pipeline = 'mudanzas';

  @ApiPropertyOptional({
    example: 'estimado',
    description: 'Texto a buscar en etapa del deal',
    default: 'estimado',
  })
  @IsOptional()
  @IsString()
  stage = 'estimado';

  @ApiPropertyOptional({
    example: 100,
    description: 'Tamaño de página para recorrer deals',
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 100;

}

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
    example: 'Agente',
    description:
      'Filtra por el valor del custom field "Tipo de operación" del deal',
  })
  @IsOptional()
  @IsString()
  operationType?: string;

  @ApiPropertyOptional({
    example: 200,
    description: 'Tamaño de página para recorrer deals',
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 100;
}

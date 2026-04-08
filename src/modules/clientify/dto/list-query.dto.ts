import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListQueryDto {
  @ApiPropertyOptional({ example: 'id,name,email' })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Transform(({ value, obj }) => value ?? obj.page_size)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;

  @ApiPropertyOptional({ example: '-created' })
  @IsOptional()
  @Transform(({ value, obj }) => value ?? obj.order_by)
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({ example: 'abc mudanzas' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ example: 'today' })
  @IsOptional()
  @IsString()
  created?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Transform(({ value, obj }) => value ?? obj.created_start)
  @IsString()
  createdStart?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Transform(({ value, obj }) => value ?? obj.created_end)
  @IsString()
  createdEnd?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value, obj }) => value ?? obj.is_filter)
  @Type(() => Boolean)
  @IsBoolean()
  isFilter?: boolean;
}

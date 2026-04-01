import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

class PipelineStageDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  position!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  probability!: number;
}

export class CreatePipelineDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ type: [PipelineStageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages!: PipelineStageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  user_default?: boolean;
}

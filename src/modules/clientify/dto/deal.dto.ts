import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class DealCustomFieldDto {
  @ApiProperty()
  @IsString()
  field!: string;

  @ApiProperty()
  value!: unknown;
}

class DealProductDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  product_id!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  quantity!: number;
}

export class CreateDealDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  owner!: number;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pipeline_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pipeline_stage_desc?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsString()
  expected_closed_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contact_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  company_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deal_source?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  involved_contacts_ids?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  involved_companies_ids?: number[];

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ type: [DealCustomFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealCustomFieldDto)
  custom_fields?: DealCustomFieldDto[];

  @ApiPropertyOptional({ type: [DealProductDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealProductDto)
  products?: DealProductDto[];
}

export class UpdateDealDto extends PartialType(CreateDealDto) {}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchContactDto {
  @ApiProperty({ example: 'juan perez' })
  @IsString()
  @IsNotEmpty()
  query!: string;
}
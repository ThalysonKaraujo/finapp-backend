import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Alimentação',
    description: 'The name of the category',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: '#FF0000',
    description: 'Hex color code for the category UI',
  })
  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    example: '🍔',
    description: 'Emoji icon for the category',
  })
  @IsString()
  @IsOptional()
  icon?: string;
}

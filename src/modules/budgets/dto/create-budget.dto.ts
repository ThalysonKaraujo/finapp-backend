import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ example: 'uuid-category-123', description: 'Category ID' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ example: 30, description: 'Percentage of the budget (1-100)' })
  @IsInt()
  @Min(1)
  @Max(100)
  percentage!: number;
}

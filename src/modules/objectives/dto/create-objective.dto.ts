import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateObjectiveDto {
  @ApiProperty({ description: 'Name of the objective' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Target amount in cents' })
  @IsInt()
  @Min(1)
  targetAmount!: number;

  @ApiProperty({ description: 'Color hex code' })
  @IsString()
  color!: string;

  @ApiPropertyOptional({ description: 'Optional deadline' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;

  @ApiPropertyOptional({ description: 'Status de conclusão da meta' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

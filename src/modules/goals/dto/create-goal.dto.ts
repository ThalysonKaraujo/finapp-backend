import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  percentage!: number;
}

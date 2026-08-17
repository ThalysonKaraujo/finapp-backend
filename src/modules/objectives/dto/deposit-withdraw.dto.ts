import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class DepositWithdrawDto {
  @ApiProperty({
    description: 'Amount to deposit or withdraw in cents (must be positive)',
  })
  @IsInt()
  @Min(1)
  amount!: number;
}

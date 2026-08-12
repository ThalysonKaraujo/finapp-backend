import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: 'Nubank', description: 'The name of the wallet' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Initial balance in cents',
  })
  @IsInt()
  @IsOptional()
  balance?: number;
}

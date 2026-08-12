import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    example: 15000,
    description: 'Amount in cents (e.g. 15000 = $150.00)',
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({
    example: 'EXPENSE',
    enum: ['INCOME', 'EXPENSE'],
    description: 'Type of transaction',
  })
  @IsEnum(['INCOME', 'EXPENSE'])
  type: 'INCOME' | 'EXPENSE';

  @ApiProperty({ example: 'Market', description: 'Title of the transaction' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '2026-08-10T10:00:00.000Z',
    description: 'Date of transaction (ISO 8601)',
  })
  @IsISO8601()
  date: string;

  @ApiPropertyOptional({
    example: 'uuid-wallet-123',
    description: 'Optional wallet ID',
  })
  @IsOptional()
  @IsString()
  walletId?: string;

  @ApiPropertyOptional({
    example: 'uuid-category-123',
    description: 'Optional category ID',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

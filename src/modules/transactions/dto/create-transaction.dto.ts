import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  IsBoolean,
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
    description: 'ID da Categoria',
    example: 'uuid-da-categoria',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de parcelas/meses (1 para transação única)',
    example: 12,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  installments?: number;

  @ApiPropertyOptional({
    description: 'Se verdadeiro, projeta 24 transações mantendo o valor cheio, caracterizando uma assinatura sem fim',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isInfinite?: boolean;
}

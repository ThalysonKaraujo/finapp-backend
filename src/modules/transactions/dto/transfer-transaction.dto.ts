import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
} from 'class-validator';

export class TransferTransactionDto {
  @ApiProperty({
    example: 15000,
    description: 'Amount in cents to transfer (e.g. 15000 = $150.00)',
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({
    example: 'Transferência para o Nubank',
    description: 'Title of the transfer',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '2026-08-10T10:00:00.000Z',
    description: 'Date of transfer (ISO 8601)',
  })
  @IsISO8601()
  date: string;

  @ApiProperty({
    example: 'uuid-wallet-source',
    description: 'Source wallet ID (where money comes from)',
  })
  @IsString()
  @IsNotEmpty()
  sourceWalletId: string;

  @ApiProperty({
    example: 'uuid-wallet-destination',
    description: 'Destination wallet ID (where money goes to)',
  })
  @IsString()
  @IsNotEmpty()
  destinationWalletId: string;
}

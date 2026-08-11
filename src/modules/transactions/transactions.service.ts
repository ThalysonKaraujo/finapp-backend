import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';

import { transactions } from './transactions.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: any, // TBD: proper drizzle type
  ) {}

  async create(dto: CreateTransactionDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (dto.type !== 'INCOME' && dto.type !== 'EXPENSE') {
      throw new BadRequestException('Invalid transaction type');
    }

    const [transaction] = await this.db.insert(transactions).values({
      ...dto,
      date: new Date(dto.date),
    }).returning();
    
    return transaction;
  }
}

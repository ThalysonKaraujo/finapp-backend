import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { transactions } from './transactions.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('PG_CONNECTION')
    private readonly db: any, // TBD: proper drizzle type
  ) {}

  async create(dto: CreateTransactionDto & { userId: string }) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (dto.type !== 'INCOME' && dto.type !== 'EXPENSE') {
      throw new BadRequestException('Invalid transaction type');
    }

    const [transaction] = await this.db
      .insert(transactions)
      .values({
        ...dto,
        date: new Date(dto.date),
      })
      .returning();

    return transaction;
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    return this.db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset);
  }

  async findOne(id: string, userId: string) {
    const [transaction] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

    if (!transaction) {
      throw new NotFoundException('Transaction not found or unauthorized');
    }

    return transaction;
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto) {
    await this.findOne(id, userId); // Ensure it exists and belongs to user

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.date) {
      updateData.date = new Date(dto.date);
    }
    updateData.updatedAt = new Date();

    const [updated] = await this.db
      .update(transactions)
      .set(updateData)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Ensure it exists and belongs to user

    const [removed] = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    return removed;
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, gte } from 'drizzle-orm';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransferTransactionDto } from './dto/transfer-transaction.dto';
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

    const { installments, isInfinite, ...baseDto } = dto;
    const numInstallments = isInfinite
      ? 24
      : installments && installments > 0
        ? installments
        : 1;

    const transactionsToInsert: (typeof transactions.$inferInsert)[] = [];
    const recurrenceId =
      numInstallments > 1 || isInfinite ? crypto.randomUUID() : null;

    const baseAmount = isInfinite
      ? baseDto.amount
      : Math.floor(baseDto.amount / numInstallments);
    const remainder = isInfinite ? 0 : baseDto.amount % numInstallments;

    for (let i = 1; i <= numInstallments; i++) {
      const currentDate = new Date(baseDto.date);
      currentDate.setMonth(currentDate.getMonth() + (i - 1));

      const currentAmount = baseAmount + (i === 1 ? remainder : 0);

      transactionsToInsert.push({
        ...baseDto,
        amount: currentAmount,
        date: currentDate,
        recurrenceId,
        installmentNumber: numInstallments > 1 || isInfinite ? i : null,
        totalInstallments: isInfinite
          ? null
          : numInstallments > 1
            ? numInstallments
            : null,
      });
    }

    const inserted = await this.db
      .insert(transactions)
      .values(transactionsToInsert)
      .returning();

    return numInstallments > 1 ? inserted : inserted[0];
  }

  async transfer(userId: string, dto: TransferTransactionDto) {
    if (dto.sourceWalletId === dto.destinationWalletId) {
      throw new BadRequestException('Source and destination wallets must be different');
    }

    const { amount, sourceWalletId, destinationWalletId, date, title } = dto;
    const transferDate = new Date(date);

    const result = await this.db.transaction(async (tx) => {
      // Create TRANSFER_OUT
      const [transferOut] = await tx
        .insert(transactions)
        .values({
          userId,
          amount,
          type: 'TRANSFER_OUT',
          title,
          date: transferDate,
          walletId: sourceWalletId,
        })
        .returning();

      // Create TRANSFER_IN
      const [transferIn] = await tx
        .insert(transactions)
        .values({
          userId,
          amount,
          type: 'TRANSFER_IN',
          title,
          date: transferDate,
          walletId: destinationWalletId,
          linkedTransactionId: transferOut.id,
        })
        .returning();

      // Update TRANSFER_OUT to point to TRANSFER_IN
      await tx
        .update(transactions)
        .set({ linkedTransactionId: transferIn.id })
        .where(eq(transactions.id, transferOut.id));

      transferOut.linkedTransactionId = transferIn.id;

      return { transferOut, transferIn };
    });

    return result;
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.date))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(transactions)
        .where(eq(transactions.userId, userId)),
    ]);

    const totalPages = Math.ceil(Number(total) / limit);

    return {
      data,
      meta: {
        total: Number(total),
        page,
        limit,
        totalPages,
      },
    };
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
    const targetTransaction = await this.findOne(id, userId); // Ensure it exists and belongs to user

    const { updateFutureInstallments, ...updateDataRaw } = dto;
    const updateData: Record<string, unknown> = {
      ...updateDataRaw,
      updatedAt: new Date(),
    };

    if (
      !updateFutureInstallments ||
      !targetTransaction.recurrenceId ||
      !targetTransaction.installmentNumber
    ) {
      // Normal single update
      if (updateDataRaw.date) {
        updateData.date = new Date(updateDataRaw.date);
      }

      const [updated] = await this.db
        .update(transactions)
        .set(updateData)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning();

      return updated;
    }

    // Cascade Update: Find all future transactions in this recurrence
    const futureTransactions = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.recurrenceId, targetTransaction.recurrenceId),
          gte(
            transactions.installmentNumber,
            targetTransaction.installmentNumber,
          ),
          eq(transactions.userId, userId),
        ),
      )
      .orderBy(asc(transactions.installmentNumber));

    // We do multiple updates in a db transaction
    const updatedTransactions = await this.db.transaction(async (tx) => {
      const results: (typeof transactions.$inferSelect)[] = [];
      for (let i = 0; i < futureTransactions.length; i++) {
        const t = futureTransactions[i];
        const tUpdateData: Record<string, unknown> = {
          ...updateDataRaw,
          updatedAt: new Date(),
        };

        if (updateDataRaw.date) {
          const newDate = new Date(updateDataRaw.date);
          // Advance the month incrementally starting from the chosen new date
          newDate.setMonth(newDate.getMonth() + i);
          tUpdateData.date = newDate;
        }

        const [updated] = await tx
          .update(transactions)
          .set(tUpdateData)
          .where(eq(transactions.id, t.id))
          .returning();

        results.push(updated);
      }
      return results;
    });

    // Return the specific one the user clicked on (the first of the future ones)
    return updatedTransactions[0];
  }

  async remove(id: string, userId: string) {
    const transaction = await this.findOne(id, userId); // Ensure it exists and belongs to user

    const [removed] = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    if (transaction.linkedTransactionId) {
      await this.db
        .delete(transactions)
        .where(and(eq(transactions.id, transaction.linkedTransactionId), eq(transactions.userId, userId)));
    }

    return removed;
  }
}

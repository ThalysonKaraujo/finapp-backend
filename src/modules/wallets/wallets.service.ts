import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { wallets } from './wallets.schema';

@Injectable()
export class WalletsService {
  constructor(
    @Inject('PG_CONNECTION')
    private readonly db: any,
  ) {}

  async create(dto: CreateWalletDto, userId: string) {
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException('Name is required');
    }

    const [wallet] = await this.db
      .insert(wallets)
      .values({
        name: dto.name,
        balance: dto.balance ?? 0,
        userId: userId,
      })
      .returning();

    return wallet;
  }

  async findAll(userId: string) {
    const result = await this.db.execute(sql`
      SELECT 
        w.id,
        w.name,
        w.user_id as "userId",
        w.created_at as "createdAt",
        w.updated_at as "updatedAt",
        CAST(
          COALESCE(
            (
              SELECT SUM(
                CASE 
                  WHEN t.type = 'INCOME' OR t.type = 'TRANSFER_IN' THEN t.amount 
                  ELSE -t.amount 
                END
              )
              FROM transactions t 
              WHERE t.wallet_id = w.id
            ),
            0
          ) AS INTEGER
        ) as balance
      FROM wallets w
      WHERE w.user_id = ${userId}
      ORDER BY w.created_at DESC
    `);

    return Array.isArray(result) ? result : (result?.rows ?? []);
  }

  async findOne(id: string, userId: string) {
    const result = await this.db.execute(sql`
      SELECT 
        w.id,
        w.name,
        w.user_id as "userId",
        w.created_at as "createdAt",
        w.updated_at as "updatedAt",
        CAST(
          COALESCE(
            (
              SELECT SUM(
                CASE 
                  WHEN t.type = 'INCOME' OR t.type = 'TRANSFER_IN' THEN t.amount 
                  ELSE -t.amount 
                END
              )
              FROM transactions t 
              WHERE t.wallet_id = w.id
            ),
            0
          ) AS INTEGER
        ) as balance
      FROM wallets w
      WHERE w.id = ${id} AND w.user_id = ${userId}
    `);

    const rows = Array.isArray(result) ? result : (result?.rows ?? []);
    if (!rows || rows.length === 0) {
      throw new NotFoundException('Wallet not found or unauthorized');
    }

    return rows[0];
  }

  async update(id: string, userId: string, dto: UpdateWalletDto) {
    await this.findOne(id, userId);

    const updateData: Record<string, unknown> = { ...dto };
    updateData.updatedAt = new Date();

    const [updated] = await this.db
      .update(wallets)
      .set(updateData)
      .where(and(eq(wallets.id, id), eq(wallets.userId, userId)))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    const [removed] = await this.db
      .delete(wallets)
      .where(and(eq(wallets.id, id), eq(wallets.userId, userId)))
      .returning();

    return removed;
  }
}

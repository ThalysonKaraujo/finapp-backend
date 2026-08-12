import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
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
    return this.db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .orderBy(desc(wallets.createdAt));
  }

  async findOne(id: string, userId: string) {
    const [wallet] = await this.db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, id), eq(wallets.userId, userId)));

    if (!wallet) {
      throw new NotFoundException('Wallet not found or unauthorized');
    }

    return wallet;
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

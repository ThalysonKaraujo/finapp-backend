import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { budgets } from './budgets.schema';

@Injectable()
export class BudgetsService {
  constructor(
    @Inject('PG_CONNECTION')
    private readonly db: any,
  ) {}

  private async getTotalPercentage(userId: string): Promise<number> {
    const result = await this.db.execute(
      sql`SELECT COALESCE(SUM(percentage), 0) as "totalPercentage" FROM budgets WHERE user_id = ${userId}`,
    );
    return Number(result[0]?.totalPercentage || 0);
  }

  async create(dto: CreateBudgetDto, userId: string) {
    const total = await this.getTotalPercentage(userId);
    if (total + dto.percentage > 100) {
      throw new BadRequestException(
        `Cannot create budget. Total percentage would exceed 100%. Current total: ${total}%`,
      );
    }

    const existing = await this.db
      .select()
      .from(budgets)
      .where(
        and(eq(budgets.userId, userId), eq(budgets.categoryId, dto.categoryId)),
      );

    if (existing && existing.length > 0) {
      throw new BadRequestException('A budget for this category already exists.');
    }

    const [budget] = await this.db
      .insert(budgets)
      .values({
        percentage: dto.percentage,
        userId: userId,
        categoryId: dto.categoryId,
      })
      .returning();

    return budget;
  }

  async findAll(userId: string) {
    return this.db.select().from(budgets).where(eq(budgets.userId, userId));
  }

  async findOne(id: string, userId: string) {
    const [budget] = await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

    if (!budget) {
      throw new NotFoundException('Budget not found or unauthorized');
    }

    return budget;
  }

  async update(id: string, userId: string, dto: UpdateBudgetDto) {
    const currentBudget = await this.findOne(id, userId);

    if (
      dto.percentage !== undefined &&
      dto.percentage !== currentBudget.percentage
    ) {
      const total = await this.getTotalPercentage(userId);
      const netDifference = dto.percentage - currentBudget.percentage;

      if (total + netDifference > 100) {
        throw new BadRequestException(
          `Cannot update budget. Total percentage would exceed 100%. Current total: ${total}%`,
        );
      }
    }

    const updateData: Record<string, unknown> = { ...dto };
    updateData.updatedAt = new Date();

    const [updated] = await this.db
      .update(budgets)
      .set(updateData)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    const [removed] = await this.db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();

    return removed;
  }
}

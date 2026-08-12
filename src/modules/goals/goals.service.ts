import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { goals } from './goals.schema';

@Injectable()
export class GoalsService {
  constructor(
    @Inject('PG_CONNECTION')
    private readonly db: any,
  ) {}

  private async getTotalPercentage(userId: string): Promise<number> {
    const result = await this.db.execute(
      sql`SELECT COALESCE(SUM(percentage), 0) as "totalPercentage" FROM goals WHERE user_id = ${userId}`
    );
    return Number(result[0]?.totalPercentage || 0);
  }

  async create(dto: CreateGoalDto, userId: string) {
    const total = await this.getTotalPercentage(userId);
    if (total + dto.percentage > 100) {
      throw new BadRequestException(`Cannot create goal. Total percentage would exceed 100%. Current total: ${total}%`);
    }

    const existing = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.categoryId, dto.categoryId)));

    if (existing && existing.length > 0) {
      throw new BadRequestException('A goal for this category already exists.');
    }

    const [goal] = await this.db
      .insert(goals)
      .values({
        percentage: dto.percentage,
        userId: userId,
        categoryId: dto.categoryId,
      })
      .returning();

    return goal;
  }

  async findAll(userId: string) {
    return this.db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId));
  }

  async findOne(id: string, userId: string) {
    const [goal] = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));

    if (!goal) {
      throw new NotFoundException('Goal not found or unauthorized');
    }

    return goal;
  }

  async update(id: string, userId: string, dto: UpdateGoalDto) {
    const currentGoal = await this.findOne(id, userId);

    if (dto.percentage !== undefined && dto.percentage !== currentGoal.percentage) {
      const total = await this.getTotalPercentage(userId);
      const netDifference = dto.percentage - currentGoal.percentage;
      
      if (total + netDifference > 100) {
        throw new BadRequestException(`Cannot update goal. Total percentage would exceed 100%. Current total: ${total}%`);
      }
    }

    const updateData: Record<string, unknown> = { ...dto };
    updateData.updatedAt = new Date();

    const [updated] = await this.db
      .update(goals)
      .set(updateData)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    const [removed] = await this.db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();

    return removed;
  }
}

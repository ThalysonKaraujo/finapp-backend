import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { DepositWithdrawDto } from './dto/deposit-withdraw.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';
import { objectives } from './objectives.schema';

@Injectable()
export class ObjectivesService {
  constructor(
    @Inject('PG_CONNECTION') private readonly db: PostgresJsDatabase,
  ) {}

  async create(createObjectiveDto: CreateObjectiveDto, userId: string) {
    const { deadline, ...rest } = createObjectiveDto;
    const [newObj] = await this.db
      .insert(objectives)
      .values({
        ...rest,
        deadline: deadline ? new Date(deadline) : null,
        userId,
      })
      .returning();

    return newObj;
  }

  async findAll(userId: string) {
    return this.db
      .select()
      .from(objectives)
      .where(eq(objectives.userId, userId));
  }

  async findOne(id: string, userId: string) {
    const [obj] = await this.db
      .select()
      .from(objectives)
      .where(and(eq(objectives.id, id), eq(objectives.userId, userId)));

    if (!obj) {
      throw new NotFoundException('Objective not found');
    }

    return obj;
  }

  async update(
    id: string,
    userId: string,
    updateObjectiveDto: UpdateObjectiveDto,
  ) {
    await this.findOne(id, userId);

    const { deadline, ...rest } = updateObjectiveDto;
    const dataToSet: Record<string, unknown> = {
      ...rest,
      updatedAt: new Date(),
    };

    if (deadline !== undefined) {
      dataToSet.deadline = deadline ? new Date(deadline) : null;
    }

    const [updated] = await this.db
      .update(objectives)
      .set(dataToSet)
      .where(and(eq(objectives.id, id), eq(objectives.userId, userId)))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    const [deleted] = await this.db
      .delete(objectives)
      .where(and(eq(objectives.id, id), eq(objectives.userId, userId)))
      .returning();

    return deleted;
  }

  async deposit(id: string, userId: string, { amount }: DepositWithdrawDto) {
    const obj = await this.findOne(id, userId);

    const newAmount = obj.currentAmount + amount;

    const [updated] = await this.db
      .update(objectives)
      .set({ currentAmount: newAmount, updatedAt: new Date() })
      .where(and(eq(objectives.id, id), eq(objectives.userId, userId)))
      .returning();

    return updated;
  }

  async withdraw(id: string, userId: string, { amount }: DepositWithdrawDto) {
    const obj = await this.findOne(id, userId);

    if (amount > obj.currentAmount) {
      throw new BadRequestException('Cannot withdraw more than current amount');
    }

    const newAmount = obj.currentAmount - amount;

    const [updated] = await this.db
      .update(objectives)
      .set({ currentAmount: newAmount, updatedAt: new Date() })
      .where(and(eq(objectives.id, id), eq(objectives.userId, userId)))
      .returning();

    return updated;
  }
}

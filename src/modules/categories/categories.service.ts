import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { categories } from './categories.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject('PG_CONNECTION')
    private readonly db: any,
  ) {}

  async create(dto: CreateCategoryDto & { userId: string }) {
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException('Name is required');
    }

    const [category] = await this.db
      .insert(categories)
      .values({
        name: dto.name,
        color: dto.color,
        icon: dto.icon,
        userId: dto.userId,
      })
      .returning();

    return category;
  }

  async findAll(userId: string) {
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(desc(categories.createdAt));
  }

  async findOne(id: string, userId: string) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));

    if (!category) {
      throw new NotFoundException('Category not found or unauthorized');
    }

    return category;
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    await this.findOne(id, userId);

    const updateData: Record<string, unknown> = { ...dto };
    updateData.updatedAt = new Date();

    const [updated] = await this.db
      .update(categories)
      .set(updateData)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    const [removed] = await this.db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();

    return removed;
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    const userCategories = await this.db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(desc(categories.createdAt));

    if (userCategories.length === 0) {
      const defaultCategories = [
        { name: 'Alimentação', color: '#EF4444', icon: 'utensils', userId },
        { name: 'Contas', color: '#3B82F6', icon: 'receipt', userId },
        { name: 'Assinaturas', color: '#EC4899', icon: 'repeat', userId },
        { name: 'Lazer', color: '#8B5CF6', icon: 'gamepad-2', userId },
        { name: 'Transporte', color: '#F59E0B', icon: 'car', userId },
        { name: 'Saúde', color: '#10B981', icon: 'heart-pulse', userId },
        { name: 'Salário', color: '#22C55E', icon: 'banknote', userId },
        { name: 'Freelance', color: '#06B6D4', icon: 'laptop', userId },
        { name: 'Outros', color: '#6B7280', icon: 'tag', userId },
      ];

      const inserted = await this.db
        .insert(categories)
        .values(defaultCategories)
        .returning();

      return inserted;
    }

    return userCategories;
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

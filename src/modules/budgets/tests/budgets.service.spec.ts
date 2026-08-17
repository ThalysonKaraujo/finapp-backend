import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetsService } from '../budgets.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let mockQueryResult: any = [];
  let mockSumResult: any = [];

  const mockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi
      .fn()
      .mockImplementation(() => Promise.resolve(mockQueryResult)),
    // biome-ignore lint/suspicious/noThenProperty: Mocking Drizzle queries which are thenable
    then: (resolve: any) => {
      resolve(mockQueryResult);
    },
  };

  const mockDb = {
    insert: vi.fn().mockReturnValue(mockChain),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => {
        return Promise.resolve(mockQueryResult);
      }),
    })),
    update: vi.fn().mockReturnValue(mockChain),
    delete: vi.fn().mockReturnValue(mockChain),
    execute: vi.fn().mockImplementation(() => Promise.resolve(mockSumResult)),
  };

  beforeEach(async () => {
    mockQueryResult = [];
    mockSumResult = [{ totalPercentage: 0 }];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: 'PG_CONNECTION',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('🔴 Sad Path: should throw BadRequestException if total percentage exceeds 100', async () => {
      mockSumResult = [{ totalPercentage: 80 }]; // User already has 80%

      const dto = { categoryId: 'cat-1', percentage: 30 };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🔴 Sad Path: should throw BadRequestException if category already has a budget', async () => {
      mockSumResult = [{ totalPercentage: 50 }];
      // mock raw query for checking existing budget
      mockQueryResult = [{ id: 'budget-1' }];

      const dto = { categoryId: 'cat-1', percentage: 30 };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🟢 Happy Path: should create a budget successfully if under 100%', async () => {
      mockSumResult = [{ totalPercentage: 70 }];
      mockQueryResult = []; // Category has no budget yet

      const dto = { categoryId: 'cat-1', percentage: 30 };

      // Override insert chain to return the new budget
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'budget-uuid', ...dto }]),
      });

      const result = await service.create(dto, 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('budget-uuid');
    });
  });

  describe('update', () => {
    it('🔴 Sad Path: should throw BadRequestException if update exceeds 100%', async () => {
      mockSumResult = [{ totalPercentage: 90 }]; // Total is 90

      // Original budget is 20, they want to change to 40 (Net +20, new total 110%)
      mockQueryResult = [{ id: 'budget-1', percentage: 20 }];

      const dto = { categoryId: 'cat-1', percentage: 40 };

      await expect(service.update('budget-1', 'user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🟢 Happy Path: should update if within 100% limit', async () => {
      mockSumResult = [{ totalPercentage: 90 }];
      mockQueryResult = [{ id: 'budget-1', percentage: 20 }];

      const dto = { percentage: 30 }; // Net +10, new total 100%

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockResolvedValue([{ id: 'budget-1', percentage: 30 }]),
      });

      const result = await service.update('budget-1', 'user-1', dto);

      expect(result).toBeDefined();
      expect(result.percentage).toBe(30);
    });
  });
});

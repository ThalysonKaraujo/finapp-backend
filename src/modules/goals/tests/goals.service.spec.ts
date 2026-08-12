import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoalsService } from '../goals.service';

describe('GoalsService', () => {
  let service: GoalsService;
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
        GoalsService,
        {
          provide: 'PG_CONNECTION',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
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

    it('🔴 Sad Path: should throw BadRequestException if category already has a goal', async () => {
      mockSumResult = [{ totalPercentage: 50 }];
      // mock raw query for checking existing goal
      mockQueryResult = [{ id: 'goal-1' }];

      const dto = { categoryId: 'cat-1', percentage: 30 };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🟢 Happy Path: should create a goal successfully if under 100%', async () => {
      mockSumResult = [{ totalPercentage: 70 }];
      mockQueryResult = []; // Category has no goal yet

      const dto = { categoryId: 'cat-1', percentage: 30 };

      // Override insert chain to return the new goal
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'goal-uuid', ...dto }]),
      });

      const result = await service.create(dto, 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('goal-uuid');
    });
  });

  describe('update', () => {
    it('🔴 Sad Path: should throw BadRequestException if update exceeds 100%', async () => {
      mockSumResult = [{ totalPercentage: 90 }]; // Total is 90

      // Original goal is 20, they want to change to 40 (Net +20, new total 110%)
      mockQueryResult = [{ id: 'goal-1', percentage: 20 }];

      const dto = { categoryId: 'cat-1', percentage: 40 };

      await expect(service.update('goal-1', 'user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🟢 Happy Path: should update if within 100% limit', async () => {
      mockSumResult = [{ totalPercentage: 90 }];
      mockQueryResult = [{ id: 'goal-1', percentage: 20 }];

      const dto = { percentage: 30 }; // Net +10, new total 100%

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockResolvedValue([{ id: 'goal-1', percentage: 30 }]),
      });

      const result = await service.update('goal-1', 'user-1', dto);

      expect(result).toBeDefined();
      expect(result.percentage).toBe(30);
    });
  });
});

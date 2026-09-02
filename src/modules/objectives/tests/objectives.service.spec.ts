import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectivesService } from '../objectives.service';

describe('ObjectivesService', () => {
  let service: ObjectivesService;
  let mockQueryResult: any = [];

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
  };

  beforeEach(async () => {
    mockQueryResult = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectivesService,
        {
          provide: 'PG_CONNECTION',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ObjectivesService>(ObjectivesService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deposit', () => {
    it('🔴 Sad Path: should throw NotFoundException if objective does not exist', async () => {
      mockQueryResult = [];
      await expect(
        service.deposit('obj-1', 'user-1', { amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('🟢 Happy Path: should add amount to currentAmount', async () => {
      mockQueryResult = [
        { id: 'obj-1', currentAmount: 500, targetAmount: 1000 },
      ];

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockResolvedValue([{ id: 'obj-1', currentAmount: 600 }]),
      });

      const result = await service.deposit('obj-1', 'user-1', { amount: 100 });
      expect(result.currentAmount).toBe(600);
    });
  });

  describe('withdraw', () => {
    it('🔴 Sad Path: should throw NotFoundException if objective does not exist', async () => {
      mockQueryResult = [];
      await expect(
        service.withdraw('obj-1', 'user-1', { amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('🔴 Sad Path: should throw BadRequestException if withdrawing more than currentAmount', async () => {
      mockQueryResult = [
        { id: 'obj-1', currentAmount: 50, targetAmount: 1000 },
      ];
      await expect(
        service.withdraw('obj-1', 'user-1', { amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('🟢 Happy Path: should subtract amount from currentAmount', async () => {
      mockQueryResult = [
        { id: 'obj-1', currentAmount: 500, targetAmount: 1000 },
      ];

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockResolvedValue([{ id: 'obj-1', currentAmount: 400 }]),
      });

      const result = await service.withdraw('obj-1', 'user-1', { amount: 100 });
      expect(result.currentAmount).toBe(400);
    });
  });
});

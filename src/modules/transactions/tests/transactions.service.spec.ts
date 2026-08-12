import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionsService } from '../transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  let mockQueryResult: any = [];

  const mockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi
      .fn()
      .mockImplementation(() => Promise.resolve(mockQueryResult)),
    // biome-ignore lint/suspicious/noThenProperty: Necessário para mockar a Promise do Drizzle
    // biome-ignore lint/suspicious/noThenProperty: Mocking Drizzle queries which are thenable
    then: (resolve: any) => {
      resolve(mockQueryResult);
    },
  };

  const mockDb = {
    insert: vi.fn().mockReturnValue(mockChain),
    select: vi.fn().mockReturnValue(mockChain),
    update: vi.fn().mockReturnValue(mockChain),
    delete: vi.fn().mockReturnValue(mockChain),
  };

  beforeEach(async () => {
    mockQueryResult = []; // reset query result
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: 'PG_CONNECTION',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    it('🔴 Sad Path: should throw BadRequestException if amount is negative or zero', async () => {
      const dto = {
        amount: -1500, // cannot have negative amount in cents
        type: 'EXPENSE',
        title: 'Ifood',
        date: new Date(),
        userId: 'user-123',
        walletId: 'wallet-123',
        categoryId: 'cat-123',
      };

      // TDD: we expect our service to block negative amounts natively
      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🔴 Sad Path: should throw BadRequestException if type is invalid', async () => {
      const dto = {
        amount: 1500,
        type: 'INVALID_TYPE',
        title: 'Ifood',
        date: new Date(),
        userId: 'user-123',
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🟢 Happy Path: should create a transaction successfully saving as cents', async () => {
      const dto = {
        amount: 5000,
        type: 'INCOME',
        title: 'Salário',
        date: new Date().toISOString(),
        userId: 'user-1',
        walletId: 'wallet-1',
        categoryId: 'cat-1',
      };

      const expectedResponse = {
        id: 'txn-uuid',
        ...dto,
        date: new Date(dto.date),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQueryResult = [expectedResponse];

      const result = await service.create(dto as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findAll', () => {
    it('🟢 Happy Path: should return transactions with pagination', async () => {
      mockQueryResult = [{ id: '1', total: 10 }];
      const result = await service.findAll('user-1', 1, 20);
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('🔴 Sad Path: should throw NotFoundException if transaction does not exist', async () => {
      mockQueryResult = [];
      await expect(service.findOne('invalid-id', 'user-1')).rejects.toThrow();
    });

    it('🟢 Happy Path: should return the transaction', async () => {
      mockQueryResult = [{ id: 'txn-uuid', userId: 'user-1' }];
      const result = await service.findOne('txn-uuid', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('🔴 Sad Path: should throw NotFoundException if trying to update non-existing transaction', async () => {
      mockQueryResult = []; // Find returns empty
      await expect(
        service.update('invalid-id', 'user-1', { amount: 10 }),
      ).rejects.toThrow();
    });

    it('🟢 Happy Path: should update the transaction', async () => {
      // Find returns mock, then Update returns mock
      // Since it's a simple mock array, we can just return the updated item for both.
      mockQueryResult = [{ id: 'txn-uuid', userId: 'user-1', amount: 10 }];
      const result = await service.update('txn-uuid', 'user-1', { amount: 10 });
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('🔴 Sad Path: should throw NotFoundException if trying to remove non-existing transaction', async () => {
      mockQueryResult = []; // Find returns empty
      await expect(service.remove('invalid-id', 'user-1')).rejects.toThrow();
    });

    it('🟢 Happy Path: should remove the transaction', async () => {
      mockQueryResult = [{ id: 'txn-uuid', userId: 'user-1' }];
      const result = await service.remove('txn-uuid', 'user-1');
      expect(result).toBeDefined();
    });
  });
});

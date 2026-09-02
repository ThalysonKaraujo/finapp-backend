import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionsService } from '../transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  let mockQueryResult: any = [];

  const mockChain = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
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
    transaction: vi.fn().mockImplementation(async (cb) => cb(mockDb)),
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
        type: 'EXPENSE' as const,
        title: 'Mercado',
        date: new Date(),
        userId: 'user-1',
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🔴 Sad Path: should throw BadRequestException if type is invalid', async () => {
      const dto = {
        amount: 1500,
        type: 'INVALID_TYPE' as any,
        title: 'Mercado',
        date: new Date(),
        userId: 'user-1',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('🟢 Happy Path: should successfully create a single transaction', async () => {
      const dto = {
        amount: 5000, // R$ 50,00
        type: 'INCOME' as const,
        title: 'Salário',
        date: new Date(),
        userId: 'user-1',
      };

      const expectedResponse = {
        id: 'txn-1',
        ...dto,
      };

      mockQueryResult = [expectedResponse];

      const result = await service.create(dto as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it('🟢 Happy Path: should successfully create fixed installments', async () => {
      const dto = {
        amount: 10000, // R$ 100,00 in 3 installments
        type: 'EXPENSE' as const,
        title: 'Parcelado',
        date: new Date('2026-03-01'),
        installments: 3,
        userId: 'user-1',
      };

      const expectedResponse = [
        { id: 'txn-1', amount: 3334, installmentNumber: 1 },
        { id: 'txn-2', amount: 3333, installmentNumber: 2 },
        { id: 'txn-3', amount: 3333, installmentNumber: 3 },
      ];

      mockQueryResult = expectedResponse;

      const result = await service.create(dto as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it('🟢 Happy Path: should successfully create infinite/recurrent transactions (24 months preview)', async () => {
      const dto = {
        amount: 5000, // R$ 50,00 fixed recurring
        type: 'EXPENSE' as const,
        title: 'Internet Recorrente',
        date: new Date('2026-03-01'),
        isInfinite: true,
        userId: 'user-1',
      };

      const expectedResponse = Array.from({ length: 24 }).map((_, i) => ({
        id: `txn-${i + 1}`,
        amount: 5000,
        installmentNumber: i + 1,
      }));

      mockQueryResult = expectedResponse;

      const result = await service.create(dto as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('transfer', () => {
    it('🔴 Sad Path: should throw BadRequestException if source and destination are the same', async () => {
      const dto = {
        amount: 1000,
        sourceWalletId: 'wallet-1',
        destinationWalletId: 'wallet-1',
        title: 'Transfer',
        date: '2026-09-01T10:00:00Z',
      };

      await expect(service.transfer('user-1', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🟢 Happy Path: should create two linked transactions for transfer', async () => {
      const dto = {
        amount: 1000,
        sourceWalletId: 'wallet-1',
        destinationWalletId: 'wallet-2',
        title: 'Transferência',
        date: '2026-09-01T10:00:00Z',
      };

      // Mock sequence for transaction cb
      mockQueryResult = [{ id: 'trans-out-1' }]; // mocked return for inserts

      const result = await service.transfer('user-1', dto as any);

      expect(mockDb.transaction).toHaveBeenCalled();
      // Since our transaction mock simply invokes the callback with mockDb:
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();

      expect(result).toHaveProperty('transferOut');
      expect(result).toHaveProperty('transferIn');
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
      mockQueryResult = [
        {
          id: 'txn-1',
          userId: 'user-1',
          amount: 5000,
          installmentNumber: null,
          recurrenceId: null,
        },
      ];

      const result = await service.update('txn-1', 'user-1', {
        title: 'Novo Titulo',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('🟢 Happy Path: should cascade update future installments when updateFutureInstallments is true', async () => {
      // First findOne -> returns target with recurrence
      // Next find future installments -> returns array of 2
      // Then tx updates -> returns updated array
      mockQueryResult = [
        {
          id: 'txn-1',
          userId: 'user-1',
          amount: 5000,
          installmentNumber: 2,
          recurrenceId: 'rec-123',
        },
        {
          id: 'txn-2',
          userId: 'user-1',
          amount: 5000,
          installmentNumber: 3,
          recurrenceId: 'rec-123',
        },
      ];

      const result = await service.update('txn-1', 'user-1', {
        amount: 6000,
        updateFutureInstallments: true,
      });

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('🔴 Sad Path: should throw NotFoundException if trying to remove non-existing transaction', async () => {
      mockQueryResult = [];
      await expect(service.remove('invalid-id', 'user-1')).rejects.toThrow();
    });

    it('🟢 Happy Path: should also remove linked transaction if exists', async () => {
      mockQueryResult = [
        { id: 'txn-1', userId: 'user-1', linkedTransactionId: 'txn-2' },
      ];
      await service.remove('txn-1', 'user-1');

      // Called twice: once for the main transaction, once for the linked one
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });
  });
});

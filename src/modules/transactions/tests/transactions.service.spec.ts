import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionsService } from '../transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  // Mocking the Drizzle DB instance methods
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };

  beforeEach(async () => {
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
      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('🔴 Sad Path: should throw BadRequestException if type is invalid', async () => {
      const dto = {
        amount: 1500,
        type: 'INVALID_TYPE', 
        title: 'Ifood',
        date: new Date(),
        userId: 'user-123',
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('🟢 Happy Path: should create a transaction successfully saving as cents', async () => {
      const dto = {
        amount: 5000, // 50.00
        type: 'INCOME',
        title: 'Salário',
        date: new Date(),
        userId: 'user-1',
        walletId: 'wallet-1',
        categoryId: 'cat-1',
      };

      const expectedResponse = { id: 'txn-uuid', ...dto, createdAt: new Date(), updatedAt: new Date() };
      
      // Mock db insertion returning the transaction
      mockDb.returning.mockResolvedValue([expectedResponse]);

      const result = await service.create(dto as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });
});

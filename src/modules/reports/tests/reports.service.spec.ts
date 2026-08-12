import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsService } from '../reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockQueryResult: any = [];

  const mockDb = {
    execute: vi.fn().mockImplementation(() => Promise.resolve(mockQueryResult)),
  };

  beforeEach(async () => {
    mockQueryResult = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: 'PG_CONNECTION',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthlySummary', () => {
    it('🟢 Happy Path: should return the calculated monthly summary', async () => {
      // Mocking the raw query results we expect from Postgres
      mockQueryResult = [
        {
          incomes: '50000',
          expenses: '25000',
          balance: '25000',
          expensesByCategory: [
            {
              categoryId: 'cat-1',
              name: 'Alimentação',
              total: '15000',
              color: '#FF0000',
            },
            {
              categoryId: 'cat-2',
              name: 'Transporte',
              total: '10000',
              color: '#0000FF',
            },
          ],
        },
      ];

      const result = await service.getMonthlySummary('user-1', 8, 2026);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.incomes).toBe(50000); // Service should parse string to number
      expect(result.expenses).toBe(25000);
      expect(result.balance).toBe(25000);
      expect(result.expensesByCategory.length).toBe(2);
      expect(result.expensesByCategory[0].total).toBe(15000);
    });

    it('🟢 Happy Path: should handle empty months gracefully', async () => {
      mockQueryResult = [];

      const result = await service.getMonthlySummary('user-1', 8, 2026);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.incomes).toBe(0);
      expect(result.expenses).toBe(0);
      expect(result.balance).toBe(0);
      expect(result.expensesByCategory).toEqual([]);
    });
  });
});

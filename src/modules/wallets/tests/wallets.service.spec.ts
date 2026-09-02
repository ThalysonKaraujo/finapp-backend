import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WalletsService } from '../wallets.service';

describe('WalletsService', () => {
  let service: WalletsService;
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
    execute: vi.fn().mockImplementation(() => Promise.resolve(mockQueryResult)),
  };

  beforeEach(async () => {
    mockQueryResult = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: 'PG_CONNECTION',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('🔴 Sad Path: should throw BadRequestException if name is empty', async () => {
      const dto = {
        name: '',
      };

      await expect(service.create(dto as any, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🟢 Happy Path: should create a wallet successfully with balance 0 as default', async () => {
      const dto = {
        name: 'Nubank',
      };

      const expectedResponse = {
        id: 'wallet-uuid',
        name: 'Nubank',
        balance: 0,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQueryResult = [expectedResponse];

      const result = await service.create(dto as any, 'user-1');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it('🟢 Happy Path: should create a wallet successfully with initial balance', async () => {
      const dto = {
        name: 'Nubank',
        balance: 1000,
      };

      const expectedResponse = {
        id: 'wallet-uuid',
        name: 'Nubank',
        balance: 1000,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQueryResult = [expectedResponse];

      const result = await service.create(dto as any, 'user-1');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findAll', () => {
    it('🟢 Happy Path: should return wallets for a user', async () => {
      mockQueryResult = [{ id: '1', name: 'Nubank' }];
      const result = await service.findAll('user-1');
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('🔴 Sad Path: should throw NotFoundException if wallet does not exist', async () => {
      mockQueryResult = [];
      await expect(service.findOne('invalid-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('🟢 Happy Path: should return the wallet', async () => {
      mockQueryResult = [{ id: 'wallet-uuid', userId: 'user-1' }];
      const result = await service.findOne('wallet-uuid', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('🔴 Sad Path: should throw NotFoundException if trying to update non-existing wallet', async () => {
      mockQueryResult = [];
      await expect(
        service.update('invalid-id', 'user-1', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('🟢 Happy Path: should update the wallet', async () => {
      mockQueryResult = [
        { id: 'wallet-uuid', userId: 'user-1', name: 'Updated' },
      ];
      const result = await service.update('wallet-uuid', 'user-1', {
        name: 'Updated',
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('🔴 Sad Path: should throw NotFoundException if trying to remove non-existing wallet', async () => {
      mockQueryResult = [];
      await expect(service.remove('invalid-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('🟢 Happy Path: should remove the wallet', async () => {
      mockQueryResult = [{ id: 'wallet-uuid', userId: 'user-1' }];
      const result = await service.remove('wallet-uuid', 'user-1');
      expect(result).toBeDefined();
    });
  });
});

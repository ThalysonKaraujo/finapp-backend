import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesService } from '../categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
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
  };

  beforeEach(async () => {
    mockQueryResult = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: 'PG_CONNECTION',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('🔴 Sad Path: should throw BadRequestException if name is empty', async () => {
      const dto = {
        name: '',
        color: '#FFF',
        icon: 'test',
        userId: 'user-1',
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🟢 Happy Path: should create a category successfully', async () => {
      const dto = {
        name: 'Alimentação',
        color: '#FF0000',
        icon: 'burger',
        userId: 'user-1',
      };

      const expectedResponse = {
        id: 'cat-uuid',
        ...dto,
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
    it('🟢 Happy Path: should return categories for a user', async () => {
      mockQueryResult = [{ id: '1', name: 'Transporte' }];
      const result = await service.findAll('user-1');
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('🔴 Sad Path: should throw NotFoundException if category does not exist', async () => {
      mockQueryResult = [];
      await expect(service.findOne('invalid-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('🟢 Happy Path: should return the category', async () => {
      mockQueryResult = [{ id: 'cat-uuid', userId: 'user-1' }];
      const result = await service.findOne('cat-uuid', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('🔴 Sad Path: should throw NotFoundException if trying to update non-existing category', async () => {
      mockQueryResult = [];
      await expect(
        service.update('invalid-id', 'user-1', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('🟢 Happy Path: should update the category', async () => {
      mockQueryResult = [{ id: 'cat-uuid', userId: 'user-1', name: 'Updated' }];
      const result = await service.update('cat-uuid', 'user-1', {
        name: 'Updated',
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('🔴 Sad Path: should throw NotFoundException if trying to remove non-existing category', async () => {
      mockQueryResult = [];
      await expect(service.remove('invalid-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('🟢 Happy Path: should remove the category', async () => {
      mockQueryResult = [{ id: 'cat-uuid', userId: 'user-1' }];
      const result = await service.remove('cat-uuid', 'user-1');
      expect(result).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryOrders, OrderFilters } from '../query-orders';
import { OrderRepositoryPort, FindFilters } from '../../ports/order-repository.port';
import { User } from '../../../domain/user';
import { Order } from '../../../domain/order';
import { Product } from '../../../domain/product';

describe('QueryOrders', () => {
  let queryOrders: QueryOrders;
  let mockOrderRepository: OrderRepositoryPort;
  let mockUsers: User[];

  beforeEach(() => {
    mockUsers = [
      new User(1, 'John Doe', [
        new Order(101, new Date('2023-01-15'), [
          new Product(1001, 'Product A', 1500),
          new Product(1002, 'Product B', 2000),
        ]),
        new Order(102, new Date('2023-02-20'), [new Product(1003, 'Product C', 3000)]),
      ]),
      new User(2, 'Jane Smith', [
        new Order(201, new Date('2023-03-10'), [new Product(2001, 'Product D', 1200)]),
      ]),
    ];

    const findFn = vi.fn().mockResolvedValue(mockUsers);
    mockOrderRepository = {
      saveAll: vi.fn().mockResolvedValue(undefined),
      find: findFn as unknown as (filters?: FindFilters) => Promise<User[]>,
    };

    queryOrders = new QueryOrders(mockOrderRepository);
  });

  it('should return all users when no filters are provided', async () => {
    const result = await queryOrders.execute();

    expect(mockOrderRepository.find).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(mockUsers);
    expect(result).toHaveLength(2);
  });

  it('should apply orderId filter when provided', async () => {
    const filters: OrderFilters = { orderId: '101' };
    const filteredUsers = [mockUsers[0]];
    vi.spyOn(mockOrderRepository, 'find').mockResolvedValueOnce(filteredUsers);

    const result = await queryOrders.execute(filters);

    expect(mockOrderRepository.find).toHaveBeenCalledWith(filters);
    expect(result).toEqual(filteredUsers);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('should apply date range filters when provided', async () => {
    const startDate = new Date('2023-02-01');
    const endDate = new Date('2023-03-15');
    const filters: OrderFilters = { startDate, endDate };

    vi.spyOn(mockOrderRepository, 'find').mockResolvedValueOnce(mockUsers);

    const result = await queryOrders.execute(filters);

    expect(mockOrderRepository.find).toHaveBeenCalledWith(filters);
    expect(result).toEqual(mockUsers);
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no matches are found', async () => {
    const filters: OrderFilters = { orderId: '999' };
    vi.spyOn(mockOrderRepository, 'find').mockResolvedValueOnce([]);

    const result = await queryOrders.execute(filters);

    expect(mockOrderRepository.find).toHaveBeenCalledWith(filters);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should combine multiple filters when provided', async () => {
    const filters: OrderFilters = {
      orderId: '201',
      startDate: new Date('2023-03-01'),
      endDate: new Date('2023-03-31'),
    };
    const filteredUsers = [mockUsers[1]];
    vi.spyOn(mockOrderRepository, 'find').mockResolvedValueOnce(filteredUsers);

    const result = await queryOrders.execute(filters);

    expect(mockOrderRepository.find).toHaveBeenCalledWith(filters);
    expect(result).toEqual(filteredUsers);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';
import { UserMapper } from '../user.mapper';
import { User } from '../../../../domain/user';
import { Order } from '../../../../domain/order';
import { Product } from '../../../../domain/product';

describe('UserMapper', () => {
  describe('toResponse', () => {
    it('should map User domain objects to ResultUserSchema format', () => {
      const users: User[] = [
        new User(1, 'John Doe', [
          new Order(101, new Date('2023-01-15'), [
            new Product(201, 'Product 1', 1099),
            new Product(202, 'Product 2', 2499),
          ]),
          new Order(102, new Date('2023-02-20'), [new Product(203, 'Product 3', 1599)]),
        ]),
        new User(2, 'Jane Smith', [
          new Order(103, new Date('2023-03-10'), [
            new Product(204, 'Product 4', 3299),
            new Product(205, 'Product 5', 999),
          ]),
        ]),
      ];

      const result = UserMapper.toResponse(users);

      expect(result).toEqual([
        {
          user_id: 1,
          name: 'John Doe',
          orders: [
            {
              order_id: 101,
              total: '35.98',
              date: '2023-01-15',
              products: [
                { product_id: 201, product_value: '10.99' },
                { product_id: 202, product_value: '24.99' },
              ],
            },
            {
              order_id: 102,
              total: '15.99',
              date: '2023-02-20',
              products: [{ product_id: 203, product_value: '15.99' }],
            },
          ],
        },
        {
          user_id: 2,
          name: 'Jane Smith',
          orders: [
            {
              order_id: 103,
              total: '42.98',
              date: '2023-03-10',
              products: [
                { product_id: 204, product_value: '32.99' },
                { product_id: 205, product_value: '9.99' },
              ],
            },
          ],
        },
      ]);
    });

    it('should handle empty users array', () => {
      const users: User[] = [];

      const result = UserMapper.toResponse(users);

      expect(result).toEqual([]);
    });

    it('should handle users with no orders', () => {
      const users: User[] = [new User(1, 'John Doe', [])];

      const result = UserMapper.toResponse(users);
      expect(result).toEqual([
        {
          user_id: 1,
          name: 'John Doe',
          orders: [],
        },
      ]);
    });
  });

  describe('parseMoney', () => {
    it('should convert cents to dollars string format', () => {
      expect(UserMapper.parseMoney(1099)).toBe('10.99');
      expect(UserMapper.parseMoney(999)).toBe('9.99');
      expect(UserMapper.parseMoney(2000)).toBe('20');
      expect(UserMapper.parseMoney(0)).toBe('0');
    });
  });
});

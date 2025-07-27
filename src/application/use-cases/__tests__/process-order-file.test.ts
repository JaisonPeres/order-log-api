import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessOrderFile } from '../process-order-file';
import { RabbitMQAdapterPort } from '../../ports/rabbitmq-adapter.port';
import { User } from '../../../domain/user';
import { Order } from '../../../domain/order';

describe('ProcessOrderFile', () => {
  let processOrderFile: ProcessOrderFile;
  let mockRabbitMQAdapter: RabbitMQAdapterPort;

  beforeEach(() => {
    mockRabbitMQAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      assertQueue: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
      consume: vi.fn().mockResolvedValue(undefined),
      setupDeadLetterQueue: vi.fn().mockResolvedValue(undefined),
    };

    processOrderFile = new ProcessOrderFile(mockRabbitMQAdapter);
  });

  describe('parseLegacyFile', () => {
    it('should parse a legacy file content into user objects', () => {
      // Arrange
      const fileContent = `
        0000000070                              Palmer Prosacco00000007530000000003     1836.7420210308
        0000000075                                  Bobbie Batz00000007980000000002     1578.5720211116
        0000000049                               Ken Wintheiser00000005230000000003      586.7420210903
        0000000014                                 Clelia Hills00000001460000000001      673.4920211125
      `;

      // Act
      const result = processOrderFile.parseLegacyFile(fileContent);

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(70);
      expect(result[0].name).toBe('Palmer Prosacco');
      expect(result[0].orders[0].id).toBe(753);
      expect(result[0].orders[0].products[0].id).toBe(3);
      expect(result[0].orders[0].products[0].value).toBe(183674);
      expect(result[0].orders[0].date).toStrictEqual(new Date('2021-03-08'));

      expect(result[1].id).toBe(75);
      expect(result[1].name).toBe('Bobbie Batz');
      expect(result[1].orders[0].id).toBe(798);
      expect(result[1].orders[0].products[0].id).toBe(2);
      expect(result[1].orders[0].products[0].value).toBe(157857);
      expect(result[1].orders[0].date).toStrictEqual(new Date('2021-11-16'));

      expect(result[2].id).toBe(49);
      expect(result[2].name).toBe('Ken Wintheiser');
      expect(result[2].orders[0].id).toBe(523);
      expect(result[2].orders[0].products[0].id).toBe(3);
      expect(result[2].orders[0].products[0].value).toBe(58674);
      expect(result[2].orders[0].date).toStrictEqual(new Date('2021-09-03'));

      expect(result[3].id).toBe(14);
      expect(result[3].name).toBe('Clelia Hills');
      expect(result[3].orders[0].id).toBe(146);
      expect(result[3].orders[0].products[0].id).toBe(1);
      expect(result[3].orders[0].products[0].value).toBe(67349);
      expect(result[3].orders[0].date).toStrictEqual(new Date('2021-11-25'));
    });

    it('should handle empty file content', () => {
      // Arrange
      const fileContent = '';

      // Act
      const result = processOrderFile.parseLegacyFile(fileContent);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('execute', () => {
    it('should process file content and save users to repository', async () => {
      // Arrange
      const fileContent = '1|John Doe|john@example.com|2023-01-15|Product A';
      const parsedUsers: User[] = [
        {
          id: 1,
          name: 'John Doe',
          orders: [
            new Order(1001, new Date('2023-01-15'), [
              {
                id: 1,
                name: 'Product A',
                value: 100,
              },
            ]),
          ],
        },
      ];

      // Mock the parseLegacyFile method
      const parseLegacyFileSpy = vi.spyOn(processOrderFile, 'parseLegacyFile');
      parseLegacyFileSpy.mockReturnValue(parsedUsers);

      // Act
      await processOrderFile.execute(fileContent);

      // Assert
      expect(parseLegacyFileSpy).toHaveBeenCalledWith(fileContent);
      expect(mockRabbitMQAdapter.connect).toHaveBeenCalled();
      expect(mockRabbitMQAdapter.publish).toHaveBeenCalledTimes(parsedUsers.length);
      expect(mockRabbitMQAdapter.publish).toHaveBeenCalledWith(
        'user-orders',
        parsedUsers[0],
        expect.objectContaining({
          messageId: expect.any(String),
          timestamp: expect.any(Date),
          persistent: true,
        }),
      );
    });
  });
});

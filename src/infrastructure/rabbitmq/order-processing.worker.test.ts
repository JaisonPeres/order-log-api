import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrderProcessingWorker, UserOrderMessage } from './order-processing.worker';
import { RabbitMQAdapterPort } from '../../application/ports/rabbitmq-adapter.port';
import { OrderRepositoryPort } from '../../application/ports/order-repository.port';
import { User } from '../../domain/user';
import { Logger } from '../config/logger';

const logger = Logger.create('OrderProcessingWorkerTest');
// Mock RabbitMQAdapter
const mockRabbitMQAdapter: RabbitMQAdapterPort = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  publish: vi.fn().mockResolvedValue(undefined),
  consume: vi.fn(),
  assertQueue: vi.fn().mockResolvedValue(undefined),
  setupDeadLetterQueue: vi.fn().mockResolvedValue(undefined),
};

// Mock OrderRepository
const mockOrderRepository: OrderRepositoryPort = {
  saveAll: vi.fn().mockResolvedValue(undefined),
  find: vi.fn().mockResolvedValue([]),
};

// Mock Logger
vi.mock('../config/logger', () => {
  return {
    Logger: {
      create: () => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      }),
    },
  };
});

describe('OrderProcessingWorker', () => {
  let worker: OrderProcessingWorker;
  const queueName = 'test-queue';
  const maxPrefetch = 50;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new OrderProcessingWorker(
      mockRabbitMQAdapter,
      mockOrderRepository,
      queueName,
      maxPrefetch,
    );
  });

  afterEach(async () => {
    try {
      await worker.shutdown();
    } catch (error) {
      logger.error('Error shutting down worker:', error);
    }
  });

  describe('initialize', () => {
    it('should connect to RabbitMQ and set up queues', async () => {
      await worker.initialize();

      expect(mockRabbitMQAdapter.connect).toHaveBeenCalled();
      expect(mockRabbitMQAdapter.setupDeadLetterQueue).toHaveBeenCalledWith(queueName);
      expect(mockRabbitMQAdapter.consume).toHaveBeenCalledTimes(2); // Main queue and DLQ
    });

    it('should handle initialization errors', async () => {
      const mockError = new Error('Initialization error');
      vi.mocked(mockRabbitMQAdapter.connect).mockRejectedValueOnce(mockError);

      await expect(worker.initialize()).rejects.toThrow('Initialization error');
    });
  });

  describe('shutdown', () => {
    it('should disconnect from RabbitMQ', async () => {
      await worker.shutdown();

      expect(mockRabbitMQAdapter.disconnect).toHaveBeenCalled();
    });
  });

  describe('publishOrder', () => {
    it('should publish an order message to the queue', async () => {
      const orderMessage: UserOrderMessage = {
        id: 1,
        name: 'Test User',
        orders: [
          { id: 201, date: '2023-01-01', products: [{ id: 201, name: 'Product 1', value: 10.99 }] },
          { id: 202, date: '2023-01-02', products: [{ id: 202, name: 'Product 2', value: 20.49 }] },
        ],
      };

      await worker.publishOrder(orderMessage);

      expect(mockRabbitMQAdapter.publish).toHaveBeenCalledWith(
        queueName,
        orderMessage,
        expect.objectContaining({
          messageId: expect.stringContaining('order-1-'),
          timestamp: expect.any(Date),
        }),
      );
    });
  });

  describe('publishOrders', () => {
    it('should publish multiple order messages to the queue', async () => {
      const orderMessages: UserOrderMessage[] = [
        {
          id: 1,
          name: 'Test User 1',
          orders: [
            {
              id: 201,
              date: '2023-01-01',
              products: [{ id: 201, name: 'Product 1', value: 10.99 }],
            },
          ],
        },
        {
          id: 2,
          name: 'Test User 2',
          orders: [
            {
              id: 202,
              date: '2023-01-02',
              products: [{ id: 202, name: 'Product 2', value: 20.49 }],
            },
          ],
        },
      ];

      await worker.publishOrders(orderMessages);

      expect(mockRabbitMQAdapter.publish).toHaveBeenCalledTimes(2);
    });
  });

  describe('mapMessageToDomainUser', () => {
    it('should map message to domain user correctly', () => {
      const message: UserOrderMessage = {
        id: 1,
        name: 'Test User',
        orders: [
          {
            id: 201,
            date: '2023-01-01',
            products: [{ id: 201, name: 'Product 1', value: 10.99 }],
          },
        ],
      };

      // Access the private method using type assertion
      const mapMethod = (
        worker as unknown as { mapMessageToDomainUser: (msg: UserOrderMessage) => User }
      ).mapMessageToDomainUser.bind(worker);
      const result = mapMethod(message);

      expect(result).toEqual({
        id: 1,
        name: 'Test User',
        orders: [
          expect.objectContaining({
            id: 201,
            products: expect.arrayContaining([
              expect.objectContaining({ id: 201, name: 'Product 1', value: 10.99 }),
            ]),
          }),
        ],
      });
    });
  });

  describe('publishOrder', () => {
    it('should handle errors when saving to repository', async () => {
      // Make the repository throw an error
      vi.mocked(mockOrderRepository.saveAll).mockRejectedValueOnce(new Error('Database error'));

      // Create a test message
      const message: UserOrderMessage = {
        id: 1,
        name: 'Test User',
        orders: [
          {
            id: 201,
            date: '2023-01-01',
            products: [{ id: 201, name: 'Product 1', value: 10.99 }],
          },
        ],
      };

      // Publish the order
      await worker.publishOrder(message);

      // Verify the publish method was called
      expect(mockRabbitMQAdapter.publish).toHaveBeenCalledWith(
        queueName,
        message,
        expect.objectContaining({
          messageId: expect.stringContaining('order-1-'),
          timestamp: expect.any(Date),
        }),
      );
    });
  });
});

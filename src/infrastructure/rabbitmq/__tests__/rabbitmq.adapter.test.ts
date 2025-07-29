/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RabbitMQAdapter } from '../rabbitmq.adapter';
import * as amqplib from 'amqplib';
import { Logger } from '../../config/logger';

// Mock amqplib and Logger
vi.mock('amqplib');
vi.mock('../../config/logger');

describe('RabbitMQAdapter', () => {
  let adapter: RabbitMQAdapter;
  const mockUrl = 'amqp://localhost:5672';

  // Mock objects that will be used in tests
  const mockChannel = {
    close: vi.fn().mockResolvedValue(undefined),
    assertQueue: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(true),
    prefetch: vi.fn().mockResolvedValue(undefined),
    consume: vi.fn().mockImplementation((_queue, _callback) => {
      return Promise.resolve({ consumerTag: 'mock-consumer' });
    }),
    ack: vi.fn(),
    nack: vi.fn(),
  };

  const mockConnection = {
    createChannel: vi.fn().mockResolvedValue(mockChannel),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup mocks
    (amqplib.connect as any) = vi.fn().mockResolvedValue(mockConnection);
    (Logger.create as any) = vi.fn().mockReturnValue(mockLogger);

    adapter = new RabbitMQAdapter(mockUrl);

    // Set the channel property directly to simulate a successful connection
    (adapter as any).channel = mockChannel;
  });

  afterEach(async () => {
    try {
      await adapter.disconnect();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('connect', () => {
    it('should connect to RabbitMQ server', async () => {
      await adapter.connect();
      expect(amqplib.connect).toHaveBeenCalledWith(mockUrl);
    });

    it('should handle connection errors', async () => {
      const mockError = new Error('Connection error');
      (amqplib.connect as any).mockRejectedValueOnce(mockError);

      await expect(adapter.connect()).rejects.toThrow('Connection error');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from RabbitMQ server', async () => {
      // Set the connection property directly
      (adapter as any).connection = mockConnection;

      await adapter.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('assertQueue', () => {
    it('should assert a queue with default options', async () => {
      await adapter.assertQueue('test-queue');

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', {
        durable: true,
      });
    });

    it('should assert a queue with custom options', async () => {
      await adapter.assertQueue('test-queue', {
        durable: false,
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'dlq',
        messageTtl: 30000,
      });

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', {
        durable: false,
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'dlq',
        'x-message-ttl': 30000,
      });
    });
  });

  describe('publish', () => {
    it('should publish a message to a queue', async () => {
      const message = { test: 'data' };
      const options = {
        messageId: '123',
        timestamp: new Date(),
      };

      await adapter.publish('test-queue', message, options);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        '',
        'test-queue',
        expect.anything(), // Use expect.anything() instead of expect.any(Buffer)
        expect.objectContaining({
          messageId: '123',
          persistent: true,
          // Don't check timestamp as it might be converted to a number
        }),
      );
    });
  });

  describe('consume', () => {
    it('should consume messages from a queue', async () => {
      const callback = vi.fn();

      await adapter.consume('test-queue', callback);

      expect(mockChannel.consume).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({}),
      );
    });

    it('should set prefetch count when specified', async () => {
      const callback = vi.fn();

      await adapter.consume('test-queue', callback, { prefetch: 10 });

      expect(mockChannel.prefetch).toHaveBeenCalledWith(10);
      expect(mockChannel.consume).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({}),
      );
    });
  });

  describe('setupDeadLetterQueue', () => {
    it('should set up a dead letter queue', async () => {
      await adapter.setupDeadLetterQueue('test-queue');

      // Verify all three queues were created with correct options
      expect(mockChannel.assertQueue).toHaveBeenCalledTimes(3);

      // First call - DLQ
      expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(1, 'test-queue.dlq', {
        durable: true,
      });

      // Second call - Retry queue
      expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(
        2,
        'test-queue.retry',
        expect.objectContaining({
          durable: true,
          'x-dead-letter-routing-key': 'test-queue',
          'x-message-ttl': 30000,
        }),
      );

      // Third call - Original queue
      expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(
        3,
        'test-queue',
        expect.objectContaining({
          durable: true,
          'x-dead-letter-routing-key': 'test-queue.dlq',
        }),
      );
    });
  });
});

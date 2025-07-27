/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RabbitMQAdapter } from './rabbitmq.adapter';
import * as amqplib from 'amqplib';
import { Logger } from '../config/logger';

// Mock amqplib and Logger before importing any modules
vi.mock('amqplib');
vi.mock('../config/logger');

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
    // Setup mocks before each test
    vi.mocked(amqplib.connect).mockResolvedValue(mockConnection as any);
    vi.mocked(Logger.create).mockReturnValue(mockLogger as any);

    adapter = new RabbitMQAdapter(mockUrl);
    vi.clearAllMocks();
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
      vi.mocked(amqplib.connect).mockRejectedValueOnce(mockError);

      await expect(adapter.connect()).rejects.toThrow('Connection error');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from RabbitMQ server', async () => {
      await adapter.connect();
      await adapter.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('assertQueue', () => {
    it('should assert a queue with default options', async () => {
      await adapter.connect();
      await adapter.assertQueue('test-queue');

      // Use the mock objects directly
      const channel = mockChannel;

      expect(channel.assertQueue).toHaveBeenCalledWith('test-queue', {
        durable: true,
      });
    });

    it('should assert a queue with custom options', async () => {
      await adapter.connect();
      await adapter.assertQueue('test-queue', {
        durable: false,
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'dlq',
        messageTtl: 30000,
      });

      // Use the mock objects directly
      const channel = mockChannel;

      expect(channel.assertQueue).toHaveBeenCalledWith('test-queue', {
        durable: false,
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'dlq',
        'x-message-ttl': 30000,
      });
    });
  });

  describe('publish', () => {
    it('should publish a message to a queue', async () => {
      await adapter.connect();
      const message = { test: 'message' };
      await adapter.publish('test-queue', message);

      // Use the mock objects directly
      const channel = mockChannel;

      expect(channel.assertQueue).toHaveBeenCalledWith('test-queue', expect.any(Object));
      expect(channel.publish).toHaveBeenCalledWith(
        '',
        'test-queue',
        Buffer.from(JSON.stringify(message)),
        expect.objectContaining({
          persistent: true,
        }),
      );
    });
  });

  describe('consume', () => {
    it('should consume messages from a queue', async () => {
      await adapter.connect();
      const callback = vi.fn();
      await adapter.consume('test-queue', callback);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', expect.any(Object));
      expect(mockChannel.consume).toHaveBeenCalledWith('test-queue', expect.any(Function), {
        noAck: false,
      });
    });

    it('should set prefetch count when specified', async () => {
      await adapter.connect();
      const callback = vi.fn();
      await adapter.consume('test-queue', callback, { prefetch: 10 });

      expect(mockChannel.prefetch).toHaveBeenCalledWith(10);
    });
  });

  describe('setupDeadLetterQueue', () => {
    it('should set up a dead letter queue', async () => {
      await adapter.connect();
      await adapter.setupDeadLetterQueue('test-queue');

      // Verify all three queues were created with correct options
      // The order of assertions should match the implementation order
      expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(1, 'test-queue.dlq', {
        durable: true,
      });

      // Check the actual options passed to the retry queue
      const secondCallArgs = mockChannel.assertQueue.mock.calls[1];
      expect(secondCallArgs[0]).toBe('test-queue.retry');
      expect(secondCallArgs[1]).toEqual({
        durable: true,
        'x-dead-letter-routing-key': 'test-queue',
        'x-message-ttl': 30000,
      });

      // Check the actual options passed to the original queue
      const thirdCallArgs = mockChannel.assertQueue.mock.calls[2];
      expect(thirdCallArgs[0]).toBe('test-queue');
      expect(thirdCallArgs[1]).toEqual({
        durable: true,
        'x-dead-letter-routing-key': 'test-queue.dlq',
      });
    });
  });
});

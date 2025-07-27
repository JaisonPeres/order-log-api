import * as amqp from 'amqplib';
import { Channel, ConsumeMessage, ChannelModel } from 'amqplib';
import {
  RabbitMQAdapterPort,
  RabbitMQMessage,
} from '../../application/ports/rabbitmq-adapter.port';
import { Logger } from '../config/logger';

export class RabbitMQAdapter implements RabbitMQAdapterPort {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly url: string;
  private readonly logger = Logger.create('RabbitMQAdapter');

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      this.connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error:', err);
        this.reconnect();
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, attempting to reconnect...');
        this.reconnect();
      });

      this.logger.info('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  private async reconnect(delay = 5000): Promise<void> {
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.logger.error('Failed to reconnect to RabbitMQ:', error);
        this.reconnect(Math.min(delay * 2, 60000)); // Exponential backoff with max 1 minute
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.channel = null;
      this.connection = null;
      this.logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
      throw error;
    }
  }

  async publish<T>(
    queue: string,
    message: T,
    options: {
      persistent?: boolean;
      messageId?: string;
      timestamp?: Date;
      headers?: Record<string, unknown>;
    } = {},
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not established');
    }

    try {
      // Ensure queue exists
      await this.assertQueue(queue);

      const content = Buffer.from(JSON.stringify(message));

      await this.channel.publish(
        '', // Default exchange
        queue,
        content,
        {
          persistent: options.persistent ?? true,
          messageId: options.messageId ?? '',
          timestamp: options.timestamp ? options.timestamp.getTime() : undefined,
          headers: options.headers,
        },
      );
    } catch (error) {
      this.logger.error(`Error publishing message to queue ${queue}:`, error);
      throw error;
    }
  }

  async consume<T>(
    queue: string,
    callback: (
      message: RabbitMQMessage<T>,
      ack: () => void,
      nack: (requeue?: boolean) => void,
    ) => Promise<void>,
    options: {
      prefetch?: number;
      noAck?: boolean;
    } = {},
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not established');
    }

    try {
      // Ensure queue exists
      await this.assertQueue(queue);

      // Set prefetch limit (max number of unacknowledged messages)
      if (options.prefetch) {
        await this.channel.prefetch(options.prefetch);
      }

      await this.channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString()) as T;
            const retryCount = msg.properties.headers?.['x-retry-count'] as number | undefined;

            const message: RabbitMQMessage<T> = {
              content,
              messageId: msg.properties.messageId || '',
              timestamp: msg.properties.timestamp ? new Date(msg.properties.timestamp) : new Date(),
              retryCount,
            };

            const ack = () => this.channel?.ack(msg);
            const nack = (requeue = false) => this.channel?.nack(msg, false, requeue);

            await callback(message, ack, nack);
          } catch (error) {
            this.logger.error('Error processing message:', error);
            // Reject the message and don't requeue it
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: options.noAck ?? false },
      );

      this.logger.info(`Consumer started for queue: ${queue}`);
    } catch (error) {
      this.logger.error(`Error consuming from queue ${queue}:`, error);
      throw error;
    }
  }

  async assertQueue(
    queue: string,
    options: {
      durable?: boolean;
      deadLetterExchange?: string;
      deadLetterRoutingKey?: string;
      messageTtl?: number;
    } = {},
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not established');
    }

    try {
      const queueOptions: Record<string, unknown> = {
        durable: options.durable ?? true,
      };

      if (options.deadLetterExchange) {
        queueOptions['x-dead-letter-exchange'] = options.deadLetterExchange;
      }

      if (options.deadLetterRoutingKey) {
        queueOptions['x-dead-letter-routing-key'] = options.deadLetterRoutingKey;
      }

      if (options.messageTtl) {
        queueOptions['x-message-ttl'] = options.messageTtl;
      }

      await this.channel.assertQueue(queue, queueOptions);
    } catch (error) {
      this.logger.error(`Error asserting queue ${queue}:`, error);
      throw error;
    }
  }

  async setupDeadLetterQueue(queue: string, dlqSuffix = '.dlq'): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not established');
    }

    const deadLetterQueue = `${queue}${dlqSuffix}`;
    const retryQueue = `${queue}.retry`;

    try {
      // Create the dead letter queue
      await this.assertQueue(deadLetterQueue, {
        durable: true,
      });

      // Create the retry queue that sends messages back to the original queue
      await this.assertQueue(retryQueue, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: queue,
        messageTtl: 30000, // 30 seconds delay before retrying
      });

      // Set up the original queue to send failed messages to the DLQ
      await this.assertQueue(queue, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: deadLetterQueue,
      });

      this.logger.info(`Dead letter queue setup complete for queue: ${queue}`);
    } catch (error) {
      this.logger.error(`Error setting up dead letter queue for ${queue}:`, error);
      throw error;
    }
  }
}

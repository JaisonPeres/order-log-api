import { RabbitMQAdapterPort } from '../../application/ports/rabbitmq-adapter.port';
import { OrderRepositoryPort } from '../../application/ports/order-repository.port';
import { User } from '../../domain/user';
import { Order } from '../../domain/order';
import { Logger } from '../config/logger';
import { Product } from '../../domain/product';

export interface UserOrderMessage {
  id: number;
  name: string;
  orders: {
    id: number;
    date: string;
    products: {
      id: number;
      name: string;
      value: number;
    }[];
  }[];
}

export class OrderProcessingWorker {
  private readonly queueName: string;
  private readonly dlqName: string;
  private readonly maxPrefetch: number;
  private readonly logger = Logger.create('OrderProcessingWorker');
  private messageBuffer: User[] = [];
  private readonly batchSize = 50;
  private processingBatch = false;

  constructor(
    private readonly rabbitMQAdapter: RabbitMQAdapterPort,
    private readonly orderRepository: OrderRepositoryPort,
    queueName = 'user-orders',
    maxPrefetch = 50,
  ) {
    this.queueName = queueName;
    this.dlqName = `${queueName}.dlq`;
    this.maxPrefetch = maxPrefetch;
  }

  async initialize(): Promise<void> {
    try {
      // Connect to RabbitMQ
      await this.rabbitMQAdapter.connect();

      // Setup the main queue and DLQ
      await this.rabbitMQAdapter.setupDeadLetterQueue(this.queueName);

      // Start consuming messages from the main queue
      await this.startConsumer();

      // Start consuming from DLQ for reprocessing
      await this.startDLQConsumer();

      this.logger.info('Order processing worker initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize order processing worker:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Process any remaining messages in the buffer
      if (this.messageBuffer.length > 0) {
        this.logger.info(
          `Processing ${this.messageBuffer.length} remaining messages before shutdown`,
        );
        await this.processBatch();
      }

      // Disconnect from RabbitMQ
      await this.rabbitMQAdapter.disconnect();
      this.logger.info('Order processing worker shut down successfully');
    } catch (error) {
      this.logger.error('Error shutting down order processing worker:', error);
      throw error;
    }
  }

  private async startConsumer(): Promise<void> {
    await this.rabbitMQAdapter.consume<UserOrderMessage>(
      this.queueName,
      async (message, ack, nack) => {
        try {
          // Convert message to domain model
          const user = this.mapMessageToDomainUser(message.content);

          // Add to buffer
          this.messageBuffer.push(user);
          this.logger.info(
            `Added message ${message.messageId} to buffer. Current buffer size: ${this.messageBuffer.length}`,
          );

          // Process batch if we've reached the batch size
          if (this.messageBuffer.length >= this.batchSize) {
            await this.processBatch();
          }

          // Acknowledge the message
          ack();
        } catch (error) {
          this.logger.error(`Error processing order message ${message.messageId}:`, error);
          nack(false);
        }
      },
      { prefetch: this.batchSize },
    );

    // Set up a periodic batch processor to handle partial batches
    setInterval(async () => {
      if (this.messageBuffer.length > 0 && !this.processingBatch) {
        this.logger.info(`Processing partial batch of ${this.messageBuffer.length} messages`);
        await this.processBatch();
      }
    }, 5000); // Check every 5 seconds
  }

  private async startDLQConsumer(): Promise<void> {
    await this.rabbitMQAdapter.consume<UserOrderMessage>(
      this.dlqName,
      async (message, ack, _nack) => {
        try {
          this.logger.info(`Reprocessing failed order from DLQ: ${message.messageId}`);

          // Check if this message has already been retried
          const retryCount = message.retryCount || 0;

          if (retryCount >= 1) {
            // We've already tried once, log and acknowledge
            this.logger.info(`Message ${message.messageId} has already been retried, discarding`);
            ack();
            return;
          }

          const user = this.mapMessageToDomainUser(message.content);

          await this.orderRepository.saveAll([user]);

          ack();

          this.logger.info(`Successfully reprocessed order from DLQ: ${message.messageId}`);
        } catch (error) {
          this.logger.error(`Error reprocessing order from DLQ ${message.messageId}:`, error);

          const retryCount = (message.retryCount || 0) + 1;

          if (retryCount >= 1) {
            this.logger.error(
              `Permanently failed to process order ${message.messageId} after retry`,
            );
            ack();
          } else {
            // Send back to DLQ with incremented retry count
            await this.rabbitMQAdapter.publish(this.dlqName, message.content, {
              messageId: message.messageId,
              timestamp: new Date(),
              headers: {
                'x-retry-count': retryCount,
              },
            });
            ack();
          }
        }
      },
      { prefetch: 10 },
    );
  }

  private mapMessageToDomainUser(message: UserOrderMessage): User {
    const orders = message.orders.map((order) => {
      const orderDate = new Date(order.date);
      const products = order.products.map((product) => {
        return new Product(product.id, product.name, product.value);
      });
      return new Order(order.id, orderDate, products);
    });
    return new User(message.id, message.name, orders);
  }

  /**
   * Process a batch of messages in a single transaction
   */
  private async processBatch(): Promise<void> {
    if (this.messageBuffer.length === 0 || this.processingBatch) {
      return;
    }

    this.processingBatch = true;

    try {
      const batchToProcess = [...this.messageBuffer];
      this.messageBuffer = [];

      this.logger.info(
        `Persisting batch of ${batchToProcess.length} users in a single transaction`,
      );

      // Save all users in a single transaction
      await this.orderRepository.saveAll(batchToProcess);

      this.logger.info(`Successfully persisted batch of ${batchToProcess.length} users`);
    } catch (error) {
      this.logger.error('Error processing batch:', error);
      throw error;
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * Publish an order message to the queue
   * @param message Order message to publish
   */
  async publishOrder(message: UserOrderMessage): Promise<void> {
    await this.rabbitMQAdapter.publish(this.queueName, message, {
      messageId: `order-${message.id}-${Date.now()}`,
      timestamp: new Date(),
    });
  }

  /**
   * Batch publish multiple user order messages to the queue
   * @param messages Array of order messages to publish
   */
  async publishOrders(messages: UserOrderMessage[]): Promise<void> {
    for (const message of messages) {
      await this.publishOrder(message);
    }
  }
}

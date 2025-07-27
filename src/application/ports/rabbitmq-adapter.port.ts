export interface RabbitMQMessage<T> {
  content: T;
  messageId: string;
  timestamp: Date;
  retryCount?: number;
}

export interface RabbitMQAdapterPort {
  /**
   * Connect to RabbitMQ server
   */
  connect(): Promise<void>;

  /**
   * Disconnect from RabbitMQ server
   */
  disconnect(): Promise<void>;

  /**
   * Publish a message to a queue
   * @param queue Queue name
   * @param message Message to publish
   * @param options Additional options
   */
  publish<T>(
    queue: string,
    message: T,
    options?: {
      persistent?: boolean;
      messageId?: string;
      timestamp?: Date;
      headers?: Record<string, unknown>;
    },
  ): Promise<void>;

  /**
   * Consume messages from a queue
   * @param queue Queue name
   * @param callback Function to process messages
   * @param options Additional options
   */
  consume<T>(
    queue: string,
    callback: (
      message: RabbitMQMessage<T>,
      ack: () => void,
      nack: (requeue?: boolean) => void,
    ) => Promise<void>,
    options?: {
      prefetch?: number;
      noAck?: boolean;
    },
  ): Promise<void>;

  /**
   * Create a queue if it doesn't exist
   * @param queue Queue name
   * @param options Additional options
   */
  assertQueue(
    queue: string,
    options?: {
      durable?: boolean;
      deadLetterExchange?: string;
      deadLetterRoutingKey?: string;
      messageTtl?: number;
    },
  ): Promise<void>;

  /**
   * Create a dead letter queue for the specified queue
   * @param queue Original queue name
   * @param dlqSuffix Suffix to add to the original queue name (default: '.dlq')
   */
  setupDeadLetterQueue(queue: string, dlqSuffix?: string): Promise<void>;
}

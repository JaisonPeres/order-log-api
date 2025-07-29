export interface RabbitMQQueueConfig {
  // Batch Settings
  batchSize: number;
  batchTimeout: number;
  prefetchCount: number;

  // Retry Settings
  retryDelay: number;
  maxRetries: number;
  dlqTtl: number;

  // Queue Settings
  queueDurability: boolean;
  messageTtl: number;
  autoDelete: boolean;
}

export const getRabbitMQQueueConfig = (): RabbitMQQueueConfig => {
  return {
    // Batch Settings
    batchSize: Number(process.env.BATCH_SIZE) || 50,
    batchTimeout: Number(process.env.BATCH_TIMEOUT) || 5,
    prefetchCount: Number(process.env.PREFETCH_COUNT) || 100,

    // Retry Settings
    retryDelay: Number(process.env.RETRY_DELAY) || 30,
    maxRetries: Number(process.env.MAX_RETRIES) || 3,
    dlqTtl: Number(process.env.DLQ_TTL) || 7 * 24 * 60 * 60, // 7 days in seconds

    // Queue Settings
    queueDurability: process.env.QUEUE_DURABILITY !== 'false',
    messageTtl: Number(process.env.MESSAGE_TTL) || 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    autoDelete: process.env.AUTO_DELETE === 'true',
  };
};

import 'dotenv/config';
import { OrderProcessingWorker } from '../rabbitmq/order-processing.worker';
import { RabbitMQAdapter } from '../rabbitmq/rabbitmq.adapter';
import { DrizzleOrderRepository } from '../db/drizzle-order.repository';
import { Logger } from '../config/logger';

const logger = Logger.create('OrderWorker');

async function startWorker() {
  try {
    logger.info('Starting Order Processing Worker...');

    const orderRepository = new DrizzleOrderRepository();

    const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const queueName = process.env.RABBITMQ_QUEUE || 'user-orders';

    const rabbitMQAdapter = new RabbitMQAdapter(rabbitMQUrl);
    const worker = new OrderProcessingWorker(rabbitMQAdapter, orderRepository, queueName);

    await worker.initialize();

    logger.info(`Worker started and consuming from queue: ${queueName}`);

    const shutdown = async () => {
      logger.info('Shutting down worker...');
      await worker.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error(
      `Failed to start worker: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

startWorker();

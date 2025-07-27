import { RabbitMQAdapter } from './rabbitmq.adapter';
import { OrderProcessingWorker } from './order-processing.worker';
import { getRabbitMQConfig } from '../config/rabbitmq.config';
import { DrizzleOrderRepository } from '../db/drizzle-order.repository';

// Create instances
const rabbitMQConfig = getRabbitMQConfig();
const rabbitMQAdapter = new RabbitMQAdapter(rabbitMQConfig.url);
const orderRepository = new DrizzleOrderRepository();

// Create worker
const orderProcessingWorker = new OrderProcessingWorker(
  rabbitMQAdapter,
  orderRepository,
  rabbitMQConfig.queues.orderQueue,
  rabbitMQConfig.prefetch,
);

export { rabbitMQAdapter, orderProcessingWorker, RabbitMQAdapter, OrderProcessingWorker };

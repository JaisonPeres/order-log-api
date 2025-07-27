export interface RabbitMQConfig {
  url: string;
  queues: {
    orderQueue: string;
    orderDlq: string;
  };
  prefetch: number;
}

export const getRabbitMQConfig = (): RabbitMQConfig => {
  return {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    queues: {
      orderQueue: process.env.RABBITMQ_ORDER_QUEUE || 'user-orders',
      orderDlq: process.env.RABBITMQ_ORDER_DLQ || 'user-orders.dlq',
    },
    prefetch: Number(process.env.RABBITMQ_PREFETCH) || 50,
  };
};

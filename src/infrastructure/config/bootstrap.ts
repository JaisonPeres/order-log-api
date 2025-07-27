import { DrizzleOrderRepository } from '../db/drizzle-order.repository';
import { ProcessOrderFile } from '../../application/use-cases/process-order-file';
import { QueryOrders } from '../../application/use-cases/query-orders';
import { RabbitMQAdapter } from '../rabbitmq/rabbitmq.adapter';
import { getRabbitMQConfig } from '../config/rabbitmq.config';

export default class UseCasesBootstrap {
  static start() {
    const orderRepository = new DrizzleOrderRepository();
    const rabbitMQAdapter = new RabbitMQAdapter(getRabbitMQConfig().url);
    const processOrderFileUseCase = new ProcessOrderFile(rabbitMQAdapter);
    const queryOrdersUseCase = new QueryOrders(orderRepository);
    return { processOrderFileUseCase, queryOrdersUseCase };
  }
}

import { DrizzleOrderRepository } from '../db/drizzle-order.repository';
import { ProcessOrderFile } from '../../application/use-cases/process-order-file';
import { QueryOrders } from '../../application/use-cases/query-orders';

export default class UseCasesBootstrap {
  static start() {
    const orderRepository = new DrizzleOrderRepository();
    const processOrderFileUseCase = new ProcessOrderFile(orderRepository);
    const queryOrdersUseCase = new QueryOrders(orderRepository);
    return { processOrderFileUseCase, queryOrdersUseCase };
  }
}

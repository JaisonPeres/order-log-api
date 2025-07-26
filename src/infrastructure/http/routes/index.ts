import { FastifyTypeInstance } from '../../types';
import { QueryOrders } from '../../../application/use-cases/query-orders';
import { ProcessOrderFile } from '../../../application/use-cases/process-order-file';
import fp from 'fastify-plugin';
import { orderRoutesPlugin } from './orders/orders.plugin';

interface RouteDependencies {
  queryOrdersUseCase: QueryOrders;
  processOrderFileUseCase: ProcessOrderFile;
}

export class Routes {
  static register = fp(async (app: FastifyTypeInstance, opts: RouteDependencies) => {
    app.register(orderRoutesPlugin, opts);
  });
}

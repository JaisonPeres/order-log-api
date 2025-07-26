import { OrdersRoutes } from './orders.routes';
import fp from 'fastify-plugin';
import { OrdersPluginOptions } from './orders.routes';
import { FastifyTypeInstance } from '../../../types';

export const ordersRouteInfo = {
  name: 'Orders',
  description: 'Orders management',
  path: '/orders',
};

export const orderRoutesPlugin = fp(async function (
  app: FastifyTypeInstance,
  opts: OrdersPluginOptions,
) {
  const ordersRoutes = new OrdersRoutes(opts, ordersRouteInfo);
  await ordersRoutes.register(app);
});

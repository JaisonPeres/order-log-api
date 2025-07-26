import { QueryOrders, OrderFilters } from '../../../../application/use-cases/query-orders';
import { FastifyTypeInstance } from '../../../types';
import { uploadFileSchema } from '../../schemas/orders/upload-file.schema';
import { ProcessOrderFile } from '../../../../application/use-cases/process-order-file';
import fp from 'fastify-plugin';
import { errorSchema } from '../../schemas/error.schema';
import { queryOrdersSchema } from '../../schemas/orders/query-orders.schema';
import { usersSchema } from '../../schemas/orders/user.schema';
import { Logger } from '../../../config/logger';
const logger = Logger.create('OrdersRoutes');

export interface OrdersPluginOptions {
  queryOrdersUseCase: QueryOrders;
  processOrderFileUseCase: ProcessOrderFile;
}

export interface OrdersPluginConfig {
  name: string;
  path: string;
}

export class OrdersRoutes {
  private queryOrdersUseCase: QueryOrders;
  private processOrderFileUseCase: ProcessOrderFile;
  private name: string;
  private path: string;

  constructor(options: OrdersPluginOptions, config: OrdersPluginConfig) {
    this.queryOrdersUseCase = options.queryOrdersUseCase;
    this.processOrderFileUseCase = options.processOrderFileUseCase;
    this.name = config.name;
    this.path = config.path;
  }

  register = fp(async (app: FastifyTypeInstance) => {
    this.registerUploadOrdersRoute(app);
    this.registerListOrdersRoute(app);
  });

  private registerUploadOrdersRoute(app: FastifyTypeInstance) {
    app.post(
      this.path,
      {
        schema: {
          tags: [this.name],
          description: 'Upload a plain text file with orders',
          body: uploadFileSchema,
          response: {
            200: 'OK',
            400: errorSchema.describe('Client Error'),
          },
          consumes: ['text/plain'],
          produces: ['application/json'],
        },
      },
      async (request, reply) => {
        try {
          await this.processOrderFileUseCase.execute(request.body);

          return reply.status(200).send();
        } catch (error) {
          logger.error('Error processing order file:', error);
          return reply.status(400).send({
            error: 'Failed to process the file',
            message: error instanceof Error ? error.message : undefined,
          });
        }
      },
    );
  }

  private registerListOrdersRoute(app: FastifyTypeInstance) {
    app.get(
      this.path,
      {
        schema: {
          tags: [this.name],
          description: 'List all orders',
          querystring: queryOrdersSchema.describe('Query orders'),
          response: {
            200: usersSchema.describe('List of orders'),
            500: errorSchema.describe('Server Error'),
          },
          consumes: ['application/json'],
          produces: ['application/json'],
        },
      },
      async (request, reply) => {
        try {
          const { orderId, startDate, endDate } = request.query as {
            orderId?: string;
            startDate?: string;
            endDate?: string;
          };

          const filters: OrderFilters = {
            orderId,
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate: new Date(endDate) }),
          };

          logger.info('Querying orders with filters:', filters);

          // const users = await this.queryOrdersUseCase.execute(filters);

          // const responseData = UserMapper.toResponse(users);

          return reply.status(200).send([]);
        } catch (error) {
          logger.error('Error querying orders:', error);
          return reply.status(500).send({
            error: 'Failed to query orders',
            message: error instanceof Error ? error.message : undefined,
          });
        }
      },
    );
  }
}

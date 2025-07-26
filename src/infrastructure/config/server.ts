
import { fastifyCors } from '@fastify/cors';
import * as dotenv from "dotenv";
import { fastify } from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { SwaggerConfig } from './swagger';
import { Routes } from '../http/routes';
import { FastifyTypeInstance } from '../types';
import { ordersRouteInfo } from '../http/routes/orders/orders.plugin';
import UseCasesBootstrap from './bootstrap';

dotenv.config();

const { LOG, STAGE } = process.env;

export async function createServer(): Promise<FastifyTypeInstance> {
  const envToLogger = {
    development: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    production: true,
    test: false,
  }
  
  const server = fastify({
    logger: envToLogger[STAGE as keyof typeof envToLogger] ?? true,
  }).withTypeProvider<ZodTypeProvider>();
  
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  server.register(fastifyCors, {
    origin: '*',
  });
  
  if (STAGE === 'development') {
    SwaggerConfig.register(server, [ordersRouteInfo]);
  }

  Routes.register(server, UseCasesBootstrap.start());


  server.get('/', async (request, reply) => {
    reply.send({
      message: 'Welcome to the API',
      version: '1.0.0',
      environment: STAGE,
      docs: '/docs',
    });
  });
  
  server.setNotFoundHandler(async (request, reply) => {
    reply.status(404).send({
      message: 'Not found',
    });
  });

  return server;
}
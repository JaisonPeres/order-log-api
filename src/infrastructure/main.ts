import * as dotenv from 'dotenv';
import { createServer } from './config/server';
import { Logger } from './config/logger';
import { orderProcessingWorker } from './rabbitmq/module';

const logger = Logger.create('Main');

dotenv.config();

const { PORT } = process.env;

async function start() {
  try {
    // Initialize RabbitMQ worker
    logger.info('Initializing RabbitMQ worker...');
    await orderProcessingWorker.initialize();
    logger.info('RabbitMQ worker initialized successfully');

    // Start HTTP server
    const server = await createServer();

    server
      .listen({
        port: Number(PORT || '3000'),
      })
      .then(() => {
        logger.info(`Server running at http://localhost:${PORT}`);
      })
      .catch((err) => {
        logger.error('Server failed to start:', err);
        process.exit(1);
      });

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      try {
        await orderProcessingWorker.shutdown();
        logger.info('RabbitMQ worker shut down successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

start();

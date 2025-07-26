import * as dotenv from 'dotenv';
import { createServer } from './config/server';
import { Logger } from './config/logger';
const logger = Logger.create('Main');

dotenv.config();

const { PORT } = process.env;

async function start() {
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
}

start();

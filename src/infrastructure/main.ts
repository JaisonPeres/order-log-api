
import * as dotenv from "dotenv";
import { createServer } from './config/server';

dotenv.config();

const { PORT } = process.env;

async function start() {
  const server = await createServer();
  
  server.listen({
    port: Number(PORT || '3000'),
  }).then(() => {
    server.log.info(`API Server listening on http://localhost:${PORT}`);
  }).catch((err) => {
      server.log.error(err);
      process.exit(1);
  })
}

start();

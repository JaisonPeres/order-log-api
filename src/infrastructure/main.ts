
import * as dotenv from "dotenv";
import { createServer } from './config/server';

dotenv.config();

const { PORT } = process.env;

async function start() {
  const server = await createServer();
  
  server.listen({
    port: Number(PORT || '3000'),
  }).catch((err) => {
      server.log.error(err);
      process.exit(1);
  })
}

start();

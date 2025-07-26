import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './client';
import { Logger } from '../config/logger';

const logger = Logger.create('Migrations');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    await migrate(db, { migrationsFolder: 'drizzle' });

    logger.info('Migrations completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}
runMigrations();

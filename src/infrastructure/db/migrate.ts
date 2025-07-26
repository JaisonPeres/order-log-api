import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './client';

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    await migrate(db, { migrationsFolder: 'drizzle' });
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}
runMigrations();

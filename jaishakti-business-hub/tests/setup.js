import { getDatabase, closeDatabase } from '../server/db/index.js';
import { runMigrations } from '../server/db/migrate.js';
import { seedDatabase } from '../server/db/seed.js';

const db = getDatabase();
runMigrations(db);
seedDatabase(db);
closeDatabase();
console.log('Test database initialized successfully.');

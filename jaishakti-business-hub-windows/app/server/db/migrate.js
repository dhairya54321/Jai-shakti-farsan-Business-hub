import { getDatabase } from './index.js';
import { INITIAL_SCHEMA_SQL } from './schema.js';
import config from '../config.js';

export function runMigrations(dbInstance = null) {
  const db = dbInstance || getDatabase();
  config.ensureDirectories();

  // Create migrations table first if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL
    );
  `);

  const appliedMigrations = db.prepare('SELECT name FROM migrations').all().map(r => r.name);

  // Migration 001: Initial Schema
  if (!appliedMigrations.includes('001_initial_schema')) {
    console.log('Applying migration: 001_initial_schema...');
    db.transaction(() => {
      db.exec(INITIAL_SCHEMA_SQL);
      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '001_initial_schema',
        new Date().toISOString()
      );
    })();
    console.log('Migration 001_initial_schema applied successfully.');
  } else {
    console.log('Migration 001_initial_schema already applied.');
  }

  return true;
}

// Allow standalone execution via `node server/db/migrate.js`
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  try {
    runMigrations();
    console.log('All migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

export default runMigrations;

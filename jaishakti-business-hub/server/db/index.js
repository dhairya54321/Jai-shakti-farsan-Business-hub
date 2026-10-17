import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import config from '../config.js';

let dbInstance = null;

export function getDatabase(dbFilePath = config.DB_PATH) {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(dbFilePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  dbInstance = new Database(dbFilePath, {
    verbose: config.NODE_ENV === 'development' ? null : null
  });

  // Optimize performance and durability
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');
  dbInstance.pragma('synchronous = NORMAL');

  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
    dbInstance = null;
  }
}

export default {
  getDatabase,
  closeDatabase
};

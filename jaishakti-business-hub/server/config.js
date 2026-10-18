import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from current working directory or server parent
const rootEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure paths are resolved relative to process.cwd() or explicit env vars
const BASE_DIR = process.env.APP_BASE_DIR ? path.resolve(process.env.APP_BASE_DIR) : process.cwd();
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(BASE_DIR, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(BASE_DIR, 'uploads');
const BACKUP_DIR = process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(BASE_DIR, 'backups');
const LOG_DIR = process.env.LOG_DIR ? path.resolve(process.env.LOG_DIR) : path.join(BASE_DIR, 'logs');

const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(DATA_DIR, 'jaishakti.sqlite');

const JWT_SECRET = process.env.JWT_SECRET || 'jaishakti-farsan-secret-key-phase1-dev-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
const DEFAULT_CURRENCY = 'INR';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Safe directory initialization
export function ensureDirectories() {
  const dirs = [DATA_DIR, UPLOADS_DIR, BACKUP_DIR, LOG_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export default {
  PORT,
  NODE_ENV,
  BASE_DIR,
  DATA_DIR,
  UPLOADS_DIR,
  BACKUP_DIR,
  LOG_DIR,
  DB_PATH,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  BUSINESS_TIMEZONE,
  DEFAULT_CURRENCY,
  GEMINI_API_KEY,
  ensureDirectories
};

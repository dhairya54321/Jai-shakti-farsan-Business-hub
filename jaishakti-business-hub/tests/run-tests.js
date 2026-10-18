import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

process.env.DB_PATH = path.join(rootDir, 'data', 'test_jaishakti.sqlite');
process.env.NODE_ENV = 'test';

// 1. Run setup.js
console.log('[Test Runner] Initializing test database at:', process.env.DB_PATH);
const setupRes = spawnSync('node', ['tests/setup.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env
});

if (setupRes.status !== 0) {
  process.exit(setupRes.status || 1);
}

// 2. Discover test files (ignoring macOS metadata files starting with ._ or .)
const testFiles = fs.readdirSync(__dirname)
  .filter(f => !f.startsWith('.') && f.endsWith('.test.js'))
  .map(f => path.join('tests', f));

// 3. Run tests sequentially
const testRes = spawnSync('node', ['--test', '--test-concurrency=1', ...testFiles], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env
});

process.exit(testRes.status || 0);

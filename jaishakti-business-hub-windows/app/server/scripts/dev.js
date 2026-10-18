import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

console.log('====================================================');
console.log('  Jai Shakti Business Hub - Development Mode');
console.log('  Backend API Server: http://localhost:3000');
console.log('  Frontend Vite Dev:  http://localhost:5173');
console.log('====================================================\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

// 1. Start Server process
const serverProcess = spawn('node', ['--watch', 'server/index.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: process.env.PORT || '3000',
    NODE_ENV: 'development'
  }
});

// 2. Start Vite client dev server
const clientProcess = spawn(npxCmd, ['vite', '--config', 'client/vite.config.js', '--host'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env
  }
});

function cleanup() {
  console.log('\nShutting down development processes...');
  try { serverProcess.kill('SIGTERM'); } catch (e) {}
  try { clientProcess.kill('SIGTERM'); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[Dev] Server process exited with code ${code}`);
  }
});

clientProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[Dev] Vite client process exited with code ${code}`);
  }
});

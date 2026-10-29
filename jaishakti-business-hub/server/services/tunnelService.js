import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TunnelService {
  constructor() {
    this.process = null;
    this.url = null;
    this.status = 'stopped'; // 'stopped' | 'starting' | 'connected' | 'error'
    this.error = null;
    this.startedAt = null;
    this.logBuffer = [];
    this.isStarting = false;
  }

  getBinaryPath() {
    const projectBin = path.resolve(__dirname, '../../bin/cloudflared');
    if (fs.existsSync(projectBin)) {
      return projectBin;
    }
    if (config.CLOUDFLARED_PATH && fs.existsSync(config.CLOUDFLARED_PATH)) {
      return config.CLOUDFLARED_PATH;
    }
    return 'cloudflared';
  }

  isAvailable() {
    const bin = this.getBinaryPath();
    if (bin === 'cloudflared') return false;
    return fs.existsSync(bin);
  }

  _spawnTunnel(port) {
    const bin = this.getBinaryPath();
    if (!fs.existsSync(bin)) {
      this.status = 'error';
      this.error = 'Cloudflared tunnel binary not found in bin directory.';
      return Promise.resolve({ success: false, error: this.error, status: 'error' });
    }

    return new Promise((resolve) => {
      try {
        const args = ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'];
        
        this.process = spawn(bin, args, {
          env: { ...process.env, HOME: process.env.HOME || '/Users/mac' },
          stdio: ['ignore', 'pipe', 'pipe']
        });

        const urlRegex = /https:\/\/([a-zA-Z0-9-]+)\.trycloudflare\.com/;
        let resolved = false;

        const handleChunk = (chunk) => {
          const text = chunk.toString();
          this.logBuffer.push(text);
          if (this.logBuffer.length > 50) this.logBuffer.shift();

          const match = text.match(urlRegex);
          if (match && match[1] !== 'api' && !this.url) {
            this.url = match[0];
            this.status = 'connected';
            this.startedAt = new Date().toISOString();
            console.log('====================================================');
            console.log('  🌐 Jai Shakti Remote Access (Cloudflare Tunnel) Active');
            console.log(`  🔗 Mobile Link: ${this.url}`);
            console.log('  📱 Open this link on your phone from anywhere (4G/5G)');
            console.log('====================================================');
            if (!resolved) {
              resolved = true;
              resolve({ success: true, url: this.url, status: this.status });
            }
          }
        };

        this.process.stdout.on('data', handleChunk);
        this.process.stderr.on('data', (chunk) => {
          const text = chunk.toString();
          if (text.includes('ERR') || text.includes('failed') || text.includes('Your quick Tunnel')) {
            console.log('[cloudflared]', text.trim());
          }
          handleChunk(chunk);
        });

        this.process.on('close', (code) => {
          if (this.status !== 'stopped') {
            console.log(`[TunnelService] cloudflared process ended (code ${code})`);
          }
          this.process = null;
          if (this.status === 'connected') {
            this.status = 'stopped';
            this.url = null;
          }
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: `Process exited with code ${code}`, status: 'stopped' });
          }
        });

        this.process.on('error', (err) => {
          console.error('[TunnelService] Process error:', err.message);
          this.status = 'error';
          this.error = err.message;
          this.process = null;
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: err.message, status: 'error' });
          }
        });

        // 18s timeout per spawn attempt
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({ success: Boolean(this.url), url: this.url, status: this.status });
          }
        }, 18000);

      } catch (err) {
        this.status = 'error';
        this.error = err.message;
        this.process = null;
        resolve({ success: false, error: err.message, status: 'error' });
      }
    });
  }

  async start(port = config.PORT, maxRetries = 3) {
    if (this.process && this.status === 'connected' && this.url) {
      return { success: true, url: this.url, status: this.status };
    }

    if (this.isStarting) {
      // Already an attempt in progress, wait a little
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.getStatus());
        }, 3000);
      });
    }

    this.isStarting = true;
    this.status = 'starting';
    this.error = null;
    this.url = null;

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const res = await this._spawnTunnel(port);
        if (res.success && this.url) {
          this.isStarting = false;
          return res;
        }

        if (attempt < maxRetries) {
          console.log(`[TunnelService] Retry ${attempt}/${maxRetries} in 2s...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      this.status = 'error';
      this.error = 'Could not establish Cloudflare tunnel connection. Please retry from Settings.';
      this.isStarting = false;
      return { success: false, error: this.error, status: 'error' };
    } finally {
      this.isStarting = false;
    }
  }

  stop() {
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch (_) {}
      this.process = null;
    }
    this.status = 'stopped';
    this.url = null;
    this.error = null;
    this.isStarting = false;
    return { success: true, status: 'stopped' };
  }

  getStatus() {
    return {
      available: this.isAvailable(),
      status: this.status,
      url: this.url,
      startedAt: this.startedAt,
      error: this.error
    };
  }
}

const tunnelService = new TunnelService();

// Clean up child process when node terminates
process.on('exit', () => tunnelService.stop());
process.on('SIGINT', () => { tunnelService.stop(); process.exit(); });
process.on('SIGTERM', () => { tunnelService.stop(); process.exit(); });

export default tunnelService;

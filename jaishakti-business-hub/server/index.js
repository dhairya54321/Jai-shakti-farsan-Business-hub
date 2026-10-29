import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import config from './config.js';
import { getDatabase, closeDatabase } from './db/index.js';
import { runMigrations } from './db/migrate.js';

// Route imports
import authRoutes from './routes/auth.js';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import vendorRoutes from './routes/vendors.js';
import workerRoutes from './routes/workers.js';
import reportRoutes from './routes/reports.js';
import voiceRoutes from './routes/voice.js';
import settingsRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import systemRoutes from './routes/system.js';
import manufacturingRoutes from './routes/manufacturing.js';
import tunnelService from './services/tunnelService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize essential directories and database
config.ensureDirectories();
const db = getDatabase();
runMigrations(db);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lightweight request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (config.NODE_ENV === 'development' || res.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// 1. Lightweight Public Health Check (Used by HEALTH-CHECK.bat & monitoring)
app.get('/api/health', (req, res) => {
  try {
    const dbTest = db.prepare('SELECT 1 as alive').get();
    res.json({
      status: 'ok',
      service: 'Jai Shakti Business Hub',
      version: '1.0.0',
      database: dbTest && dbTest.alive === 1 ? 'connected' : 'error',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// 1.5 Secure Static Upload Streaming (Images, Receipts, Scanned Diary Photos)
app.get([
  '/api/expenses/attachments/:filename',
  '/api/workers/diary-photos/:filename',
  '/uploads/:filename'
], (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(config.UPLOADS_DIR, filename);

    // Prevent directory traversal attacks
    const resolvedUploads = path.resolve(config.UPLOADS_DIR);
    const resolvedFile = path.resolve(filePath);
    if (!resolvedFile.startsWith(resolvedUploads)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Attachment file not found.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/manufacturing', manufacturingRoutes);

// 3. Serve Frontend Production Assets (built React bundle)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  // SPA fallback to index.html for all non-API GET requests
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  // If frontend not yet built, serve helpful status page
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Jai Shakti Business Hub API</title></head>
        <body style="font-family: system-ui, sans-serif; padding: 40px; line-height: 1.6;">
          <h2>Jai Shakti Farsan Mart - Business Hub</h2>
          <p>Backend API is active and healthy on port ${config.PORT}.</p>
          <p>Frontend production assets will be available after running <code>npm run build</code>.</p>
          <p>Check health at <a href="/api/health">/api/health</a></p>
        </body>
      </html>
    `);
  });
}

// Global 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: config.NODE_ENV === 'production' ? 'Internal server error occurred.' : err.message
  });
});

// Start Server (only when running directly or not in test suite)
let server = null;
const isTest = process.env.NODE_ENV === 'test' || (process.argv[1] && process.argv[1].includes('test'));

if (!isTest) {
  const HOST = process.env.HOST || '0.0.0.0';
  const nets = os.networkInterfaces();
  const netIps = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        netIps.push(net.address);
      }
    }
  }
  const displayIp = netIps[0] || 'localhost';

  server = app.listen(config.PORT, HOST, () => {
    console.log('====================================================');
    console.log(`  Jai Shakti Business Hub - Server Started`);
    console.log(`  Local URL:    http://localhost:${config.PORT}`);
    console.log(`  Network URL:  http://${displayIp}:${config.PORT} (for Mobile/Tablet)`);
    if (netIps.length > 1) {
      console.log(`  Alt IPs:      ${netIps.slice(1).map(ip => `http://${ip}:${config.PORT}`).join(', ')}`);
    }
    console.log(`  Environment:  ${config.NODE_ENV}`);
    console.log(`  Database:     ${config.DB_PATH}`);
    console.log(`  Timezone:     ${config.BUSINESS_TIMEZONE}`);
    console.log('====================================================');

    // Auto-start Cloudflare Remote Tunnel for access from anywhere (4G/5G mobile)
    if (process.env.DISABLE_TUNNEL !== 'true' && tunnelService.isAvailable()) {
      tunnelService.start(config.PORT).catch(err => {
        console.warn('[Tunnel] Could not auto-start tunnel:', err.message);
      });
    }
  });

  // Port conflict error handling
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[FATAL ERROR] Port ${config.PORT} is already in use by another application!`);
      console.error(`Please stop the existing process or set a different PORT in your .env file.`);
      console.error(`Example: PORT=3001\n`);
    } else {
      console.error('Server startup error:', err);
    }
    process.exit(1);
  });
}

// Graceful shutdown handling
function handleGracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Closing server and database safely...`);
  server.close(() => {
    closeDatabase();
    console.log('Server and database closed cleanly. Exiting.');
    process.exit(0);
  });

  // Force exit after 5s if still hanging
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

export default app;

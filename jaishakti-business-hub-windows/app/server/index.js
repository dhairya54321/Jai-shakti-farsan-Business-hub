import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from './config.js';
import { getDatabase, closeDatabase } from './db/index.js';
import { runMigrations } from './db/migrate.js';

// Route imports
import authRoutes from './routes/auth.js';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import vendorRoutes from './routes/vendors.js';
import reportRoutes from './routes/reports.js';
import voiceRoutes from './routes/voice.js';
import settingsRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import systemRoutes from './routes/system.js';

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

// 2. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);

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

// Start Server
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(config.PORT, HOST, () => {
  console.log('====================================================');
  console.log(`  Jai Shakti Business Hub - Server Started`);
  console.log(`  Local URL:    http://localhost:${config.PORT}`);
  console.log(`  Network URL:  http://192.168.0.119:${config.PORT} (for Mobile/Tablet)`);
  console.log(`  Environment:  ${config.NODE_ENV}`);
  console.log(`  Database:     ${config.DB_PATH}`);
  console.log(`  Timezone:     ${config.BUSINESS_TIMEZONE}`);
  console.log('====================================================');
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

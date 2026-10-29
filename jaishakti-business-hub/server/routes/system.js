import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getDatabase } from '../db/index.js';
import config from '../config.js';
import BackupService from '../services/backupService.js';
import tunnelService from '../services/tunnelService.js';

const router = express.Router();

// GET /api/system/health - Detailed diagnostics (Authenticated)
router.get('/health', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    config.ensureDirectories();

    // Check DB write and read
    const testResult = db.prepare('SELECT 1 as ok, datetime("now") as now_utc').get();
    const journalMode = db.pragma('journal_mode', { simple: true });

    // Check directory writable permissions
    const writableChecks = {};
    const checkDirs = [
      { name: 'data', path: config.DATA_DIR },
      { name: 'uploads', path: config.UPLOADS_DIR },
      { name: 'backups', path: config.BACKUP_DIR },
      { name: 'logs', path: config.LOG_DIR }
    ];

    for (const d of checkDirs) {
      try {
        fs.accessSync(d.path, fs.constants.W_OK | fs.constants.R_OK);
        writableChecks[d.name] = true;
      } catch (e) {
        writableChecks[d.name] = false;
      }
    }

    // Check migrations status
    const migrations = db.prepare('SELECT name, executed_at FROM migrations ORDER BY id ASC').all();

    // Last backup info
    const lastBackup = db.prepare(`
      SELECT * FROM system_backups WHERE business_id = ? AND status = 'success'
      ORDER BY completed_at DESC LIMIT 1
    `).get(req.user.business_id);

    // Database file size
    let dbSizeBytes = 0;
    if (fs.existsSync(config.DB_PATH)) {
      dbSizeBytes = fs.statSync(config.DB_PATH).size;
    }

    res.json({
      success: true,
      status: 'healthy',
      app_version: '1.0.0',
      platform: process.platform,
      hostname: os.hostname(),
      uptime_seconds: Math.floor(process.uptime()),
      database: {
        status: testResult && testResult.ok === 1 ? 'connected' : 'error',
        journal_mode: journalMode,
        file_size_bytes: dbSizeBytes,
        migrations_applied: migrations.length
      },
      storage: writableChecks,
      last_backup: lastBackup || null
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: err.message
    });
  }
});

// GET /api/system/backups - List backups (Owner/Manager only)
router.get('/backups', authenticateToken, requireRole(['owner', 'manager']), (req, res) => {
  try {
    const backups = BackupService.listBackups(req.user.business_id);
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/system/backups - Trigger manual backup (Owner/Manager only)
router.post('/backups', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const result = await BackupService.createBackup(req.user, 'manual');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Backup failed: ' + err.message });
  }
});

// POST /api/system/restore - Restore backup (Owner only, requires confirmation)
router.post('/restore', authenticateToken, requireRole(['owner']), async (req, res) => {
  const { fileName, confirm } = req.body;
  if (!confirm) {
    return res.status(400).json({
      success: false,
      error: 'Restoring a backup will replace current database. Please confirm the action.'
    });
  }
  if (!fileName) {
    return res.status(400).json({ success: false, error: 'Backup fileName is required.' });
  }

  try {
    const result = await BackupService.restoreBackup(req.user, fileName);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Restore failed: ' + err.message });
  }
});

// GET /api/system/tunnel - Get Cloudflare Remote Tunnel status & live public URL
router.get('/tunnel', authenticateToken, (req, res) => {
  res.json({
    success: true,
    ...tunnelService.getStatus()
  });
});

// POST /api/system/tunnel/start - Start Remote Tunnel (Owner/Manager only)
router.post('/tunnel/start', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const result = await tunnelService.start(config.PORT);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/system/tunnel/stop - Stop Remote Tunnel (Owner/Manager only)
router.post('/tunnel/stop', authenticateToken, requireRole(['owner', 'manager']), (req, res) => {
  const result = tunnelService.stop();
  res.json(result);
});

export default router;

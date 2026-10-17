import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import config from '../config.js';
import { getDatabase, closeDatabase } from '../db/index.js';
import { logAudit } from './expenseService.js';

export const BackupService = {
  // Create a full timestamped backup archive of database and uploaded receipts
  async createBackup(user = null, backupType = 'manual') {
    config.ensureDirectories();
    const db = getDatabase();
    const businessId = user ? user.business_id : 'biz_jaishakti_001';
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const backupFileName = `jaishakti_backup_${timestampStr}.zip`;
    const backupFilePath = path.join(config.BACKUP_DIR, backupFileName);

    const backupRecordId = 'bak_' + crypto.randomUUID();

    // Register backup start in system_backups table
    try {
      db.prepare(`
        INSERT INTO system_backups (
          id, business_id, backup_type, file_name, storage_location,
          started_at, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?, ?)
      `).run(
        backupRecordId,
        businessId,
        backupType,
        backupFileName,
        backupFilePath,
        now.toISOString(),
        user ? user.id : null,
        now.toISOString()
      );
    } catch (e) {
      console.warn('Could not record backup start in DB (may be offline CLI run):', e.message);
    }

    try {
      // 1. Checkpoint WAL to flush all transactions to main database file safely
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (err) {
        console.warn('WAL checkpoint notice:', err.message);
      }

      // 2. Prepare temporary directory for backup assembly
      const tempDumpDir = path.join(config.BACKUP_DIR, `temp_${backupRecordId}`);
      fs.mkdirSync(tempDumpDir, { recursive: true });

      // Copy database file
      const tempDbPath = path.join(tempDumpDir, 'jaishakti.sqlite');
      fs.copyFileSync(config.DB_PATH, tempDbPath);

      // Metadata manifest
      const manifest = {
        app: 'Jai Shakti Business Hub',
        version: '1.0.0',
        createdAt: now.toISOString(),
        businessId,
        backupType,
        databaseFile: 'jaishakti.sqlite',
        uploadsIncluded: fs.existsSync(config.UPLOADS_DIR)
      };
      fs.writeFileSync(path.join(tempDumpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // 3. Create ZIP Archive
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(backupFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', resolve);
        archive.on('error', reject);

        archive.pipe(output);

        // Add database and manifest
        archive.file(tempDbPath, { name: 'jaishakti.sqlite' });
        archive.file(path.join(tempDumpDir, 'manifest.json'), { name: 'manifest.json' });

        // Add uploads directory if exists
        if (fs.existsSync(config.UPLOADS_DIR)) {
          archive.directory(config.UPLOADS_DIR, 'uploads');
        }

        archive.finalize();
      });

      // Cleanup temp dump
      try {
        fs.rmSync(tempDumpDir, { recursive: true, force: true });
      } catch (e) {}

      const stats = fs.statSync(backupFilePath);
      const completedAt = new Date().toISOString();

      // Update backup record
      try {
        db.prepare(`
          UPDATE system_backups
          SET status = 'success', completed_at = ?, file_size_bytes = ?
          WHERE id = ?
        `).run(completedAt, stats.size, backupRecordId);

        if (user) {
          logAudit(db, {
            businessId,
            actorUserId: user.id,
            entityType: 'backup',
            entityId: backupRecordId,
            action: 'backup_create',
            prevValues: null,
            newValues: { fileName: backupFileName, sizeBytes: stats.size },
            reason: `Created ${backupType} backup`
          });
        }
      } catch (e) {}

      // Apply retention policy (keep latest 15 backups)
      BackupService.applyRetentionPolicy(15);

      return {
        success: true,
        fileName: backupFileName,
        filePath: backupFilePath,
        fileSizeBytes: stats.size,
        completedAt
      };
    } catch (err) {
      console.error('Backup creation error:', err);
      try {
        db.prepare(`
          UPDATE system_backups
          SET status = 'failed', completed_at = ?, error_message = ?
          WHERE id = ?
        `).run(new Date().toISOString(), err.message, backupRecordId);
      } catch (e) {}
      throw err;
    }
  },

  // Restore from a backup file with automatic pre-restore safety backup
  async restoreBackup(user, backupFileName) {
    if (user && !['owner', 'manager'].includes(user.role)) {
      throw new Error('Only business owners and managers are authorized to restore backups.');
    }

    config.ensureDirectories();
    const backupFilePath = path.join(config.BACKUP_DIR, backupFileName);

    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file ${backupFileName} not found.`);
    }

    // Step 1: Verify ZIP file integrity and contents
    const zip = new AdmZip(backupFilePath);
    const zipEntries = zip.getEntries();
    const hasDb = zipEntries.some(e => e.entryName === 'jaishakti.sqlite');
    const hasManifest = zipEntries.some(e => e.entryName === 'manifest.json');

    if (!hasDb) {
      throw new Error('Invalid backup archive. The required jaishakti.sqlite file is missing.');
    }

    // Step 2: Create a safety backup of CURRENT live state before overwriting!
    console.log('Creating pre-restore safety backup...');
    let safetyBackupInfo = null;
    try {
      safetyBackupInfo = await BackupService.createBackup(user, 'pre_restore_safety');
      console.log('Safety backup created:', safetyBackupInfo.fileName);
    } catch (e) {
      console.warn('Warning: Could not create safety backup before restore:', e.message);
    }

    // Step 3: Close active DB connection
    closeDatabase();

    // Step 4: Extract files safely
    try {
      const tempRestoreDir = path.join(config.BACKUP_DIR, `temp_restore_${Date.now()}`);
      fs.mkdirSync(tempRestoreDir, { recursive: true });
      zip.extractAllTo(tempRestoreDir, true);

      // Restore SQLite DB
      const extractedDb = path.join(tempRestoreDir, 'jaishakti.sqlite');
      if (fs.existsSync(extractedDb)) {
        fs.copyFileSync(extractedDb, config.DB_PATH);
        // Remove old WAL and SHM files to prevent corruption from mismatch
        const walPath = config.DB_PATH + '-wal';
        const shmPath = config.DB_PATH + '-shm';
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      }

      // Restore Uploads folder if present
      const extractedUploads = path.join(tempRestoreDir, 'uploads');
      if (fs.existsSync(extractedUploads)) {
        fs.cpSync(extractedUploads, config.UPLOADS_DIR, { recursive: true });
      }

      // Cleanup temp
      fs.rmSync(tempRestoreDir, { recursive: true, force: true });

      // Reconnect DB
      const newDb = getDatabase();

      if (user) {
        logAudit(newDb, {
          businessId: user.business_id,
          actorUserId: user.id,
          entityType: 'backup',
          entityId: backupFileName,
          action: 'backup_restore',
          prevValues: { restoredFrom: backupFileName },
          newValues: { safetyBackup: safetyBackupInfo ? safetyBackupInfo.fileName : null },
          reason: `Restored database from ${backupFileName}`
        });
      }

      return {
        success: true,
        restoredFrom: backupFileName,
        safetyBackup: safetyBackupInfo ? safetyBackupInfo.fileName : null,
        restoredAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('Fatal error during restore:', err);
      throw new Error(`Restore failed: ${err.message}`);
    }
  },

  // List existing backup archives
  listBackups(businessId) {
    config.ensureDirectories();
    const files = fs.readdirSync(config.BACKUP_DIR)
      .filter(f => f.endsWith('.zip') && f.startsWith('jaishakti_backup_'))
      .map(fileName => {
        const filePath = path.join(config.BACKUP_DIR, fileName);
        const stat = fs.statSync(filePath);
        return {
          fileName,
          sizeBytes: stat.size,
          createdAt: stat.birthtime || stat.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return files;
  },

  // Retain newest N backups, deleting older ones to conserve disk space
  applyRetentionPolicy(maxBackupsToKeep = 15) {
    try {
      const files = BackupService.listBackups();
      if (files.length > maxBackupsToKeep) {
        const toDelete = files.slice(maxBackupsToKeep);
        for (const item of toDelete) {
          const filePath = path.join(config.BACKUP_DIR, item.fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Rotated old backup: ${item.fileName}`);
          }
        }
      }
    } catch (err) {
      console.warn('Error applying backup retention policy:', err.message);
    }
  }
};

export default BackupService;

import BackupService from '../services/backupService.js';

const targetBackupFile = process.argv[2];

console.log('=== Jai Shakti Backup Restore Process ===');
if (!targetBackupFile) {
  console.log('Available backups:');
  const list = BackupService.listBackups();
  if (list.length === 0) {
    console.log('No backup files found in backups directory.');
    process.exit(1);
  }
  list.forEach((b, idx) => {
    console.log(` [${idx + 1}] ${b.fileName} (${(b.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
  });
  console.log('\nUsage: node server/scripts/restore-cli.js <backup_filename.zip>');
  process.exit(1);
}

try {
  console.log(`Initiating restore from: ${targetBackupFile}`);
  const result = await BackupService.restoreBackup(null, targetBackupFile);
  console.log('[SUCCESS] Database and files restored successfully!');
  if (result.safetyBackup) {
    console.log(`[SAFETY] Pre-restore safety backup preserved as: ${result.safetyBackup}`);
  }
  process.exit(0);
} catch (err) {
  console.error('[FAILED] Restore error:', err.message);
  process.exit(1);
}

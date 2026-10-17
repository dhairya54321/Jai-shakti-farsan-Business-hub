import BackupService from '../services/backupService.js';

console.log('=== Starting Jai Shakti Backup Process ===');
try {
  const result = await BackupService.createBackup(null, 'cli_script');
  console.log('[SUCCESS] Backup created successfully!');
  console.log(`File: ${result.fileName}`);
  console.log(`Path: ${result.filePath}`);
  console.log(`Size: ${(result.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
  process.exit(0);
} catch (err) {
  console.error('[FAILED] Backup error:', err.message);
  process.exit(1);
}

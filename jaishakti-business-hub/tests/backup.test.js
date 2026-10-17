import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import BackupService from '../server/services/backupService.js';
import config from '../server/config.js';

describe('G. Backup and Recovery Tests', () => {
  const testBizId = 'biz_jaishakti_001';
  const ownerUser = { id: 'usr_owner_001', username: 'admin', role: 'owner', business_id: testBizId };

  test('Backup creates a valid ZIP archive containing database and manifest', async () => {
    const result = await BackupService.createBackup(ownerUser, 'test');
    assert.equal(result.success, true);
    assert.ok(fs.existsSync(result.filePath));

    // Verify ZIP contents
    const zip = new AdmZip(result.filePath);
    const entries = zip.getEntries().map(e => e.entryName);
    assert.ok(entries.includes('jaishakti.sqlite'));
    assert.ok(entries.includes('manifest.json'));
  });

  test('Restore creates safety pre-restore backup before modifying live database', async () => {
    // List backups
    const backups = BackupService.listBackups(testBizId);
    assert.ok(backups.length > 0);

    const targetBackup = backups[0].fileName;
    const restoreResult = await BackupService.restoreBackup(ownerUser, targetBackup);

    assert.equal(restoreResult.success, true);
    assert.ok(restoreResult.safetyBackup);
    assert.ok(fs.existsSync(path.join(config.BACKUP_DIR, restoreResult.safetyBackup)));
  });
});

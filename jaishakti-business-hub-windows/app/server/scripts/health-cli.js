import http from 'http';
import config from '../config.js';
import { getDatabase } from '../db/index.js';

console.log('=== Jai Shakti Business Hub - Health Diagnostic ===');
console.log(`Checking local server on port ${config.PORT}...`);

const req = http.get(`http://localhost:${config.PORT}/api/health`, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (res.statusCode === 200 && json.status === 'ok') {
        console.log('[SUCCESS] Application is running and healthy!');
        console.log(`Version:    ${json.version}`);
        console.log(`Database:   ${json.database}`);
        console.log(`Uptime:     ${json.uptime} seconds`);
        process.exit(0);
      } else {
        console.error('[ERROR] Health check returned non-healthy status:', json);
        process.exit(1);
      }
    } catch (e) {
      console.error('[ERROR] Unexpected response from server:', data);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.log('[INFO] Server HTTP check failed, testing direct database accessibility...');
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as count FROM businesses').get();
    console.log(`[SUCCESS] Database is reachable! Found ${row.count} registered business(es).`);
    console.log(`[NOTICE] Server process is currently stopped. Run START script to start the web service.`);
    process.exit(0);
  } catch (dbErr) {
    console.error('[FATAL] Database connection failed:', dbErr.message);
    process.exit(1);
  }
});

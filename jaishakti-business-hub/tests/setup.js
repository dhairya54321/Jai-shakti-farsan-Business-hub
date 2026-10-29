import { getDatabase, closeDatabase } from '../server/db/index.js';
import { runMigrations } from '../server/db/migrate.js';
import { seedDatabase } from '../server/db/seed.js';

const db = getDatabase();
runMigrations(db);
seedDatabase(db);

// Seed required test fixtures for test runner
const now = new Date().toISOString();
const BIZ_ID = 'biz_jaishakti_001';
const testVendors = [
  { id: 'ven_001', name: 'Shree Krishna Oil Mill', gstin: '24AAACR1234F1Z1', city: 'Gondal', category: 'raw_materials', phone: '9825100001' },
  { id: 'ven_002', name: 'Ambica Besan Mill', gstin: '24BBBBA5678B1Z2', city: 'Rajkot', category: 'raw_materials', phone: '9825100002' },
  { id: 'ven_003', name: 'Gujarat Gas Agency', gstin: '24CCCCG9012C1Z3', city: 'Vadodara', category: 'gas_utilities', phone: '9825100003' },
  { id: 'ven_004', name: 'Jay Packaging Solutions', gstin: '24DDDDJ3456D1Z4', city: 'Surat', category: 'packaging_materials', phone: '9825100004' }
];

const insertVendor = db.prepare(`
  INSERT OR IGNORE INTO vendors (
    id, business_id, name, phone, city, state, gstin, category, is_active, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, 'Gujarat', ?, ?, 1, ?, ?)
`);

for (const tv of testVendors) {
  insertVendor.run(tv.id, BIZ_ID, tv.name, tv.phone, tv.city, tv.gstin, tv.category, now, now);
}

closeDatabase();
console.log('Test database initialized successfully.');

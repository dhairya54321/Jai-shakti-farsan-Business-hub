import { getDatabase } from './index.js';
import { INITIAL_SCHEMA_SQL } from './schema.js';
import config from '../config.js';

export function runMigrations(dbInstance = null) {
  const db = dbInstance || getDatabase();
  config.ensureDirectories();

  // Create migrations table first if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL
    );
  `);

  const appliedMigrations = db.prepare('SELECT name FROM migrations').all().map(r => r.name);

  // Migration 001: Initial Schema
  if (!appliedMigrations.includes('001_initial_schema')) {
    console.log('Applying migration: 001_initial_schema...');
    db.transaction(() => {
      db.exec(INITIAL_SCHEMA_SQL);
      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '001_initial_schema',
        new Date().toISOString()
      );
    })();
    console.log('Migration 001_initial_schema applied successfully.');
  } else {
    console.log('Migration 001_initial_schema already applied.');
  }

  // Migration 002: Vendor Management & Bill OCR
  if (!appliedMigrations.includes('002_vendor_management_and_bills')) {
    console.log('Applying migration: 002_vendor_management_and_bills...');
    db.transaction(() => {
      // 1. Extend vendors table safely
      const vendorColumns = db.prepare('PRAGMA table_info(vendors)').all().map(c => c.name);

      const columnsToAdd = [
        { name: 'category', def: "TEXT NOT NULL DEFAULT 'raw_materials'" },
        { name: 'alternate_phone', def: 'TEXT' },
        { name: 'email', def: 'TEXT' },
        { name: 'city', def: 'TEXT' },
        { name: 'state', def: "TEXT DEFAULT 'Gujarat'" },
        { name: 'pin_code', def: 'TEXT' },
        { name: 'gstin', def: 'TEXT' },
        { name: 'pan', def: 'TEXT' },
        { name: 'contact_person', def: 'TEXT' },
        { name: 'business_type', def: 'TEXT' },
        { name: 'payment_terms', def: "TEXT DEFAULT 'immediate'" },
        { name: 'credit_limit', def: 'REAL' },
        { name: 'created_by', def: 'TEXT' },
        { name: 'updated_by', def: 'TEXT' }
      ];

      for (const col of columnsToAdd) {
        if (!vendorColumns.includes(col.name)) {
          db.exec(`ALTER TABLE vendors ADD COLUMN ${col.name} ${col.def};`);
        }
      }

      // Backfill gstin from tax_identifier if missing
      db.exec(`
        UPDATE vendors
        SET gstin = UPPER(TRIM(tax_identifier))
        WHERE (gstin IS NULL OR gstin = '') AND tax_identifier IS NOT NULL;
      `);

      // 2. Create vendor_bills table
      db.exec(`
        CREATE TABLE IF NOT EXISTS vendor_bills (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
          expense_id TEXT REFERENCES expenses(id) ON DELETE SET NULL,
          bill_number TEXT,
          bill_date TEXT,
          due_date TEXT,
          po_number TEXT,
          subtotal REAL,
          taxable_amount REAL,
          cgst REAL,
          sgst REAL,
          igst REAL,
          other_charges REAL,
          discount REAL,
          total_amount REAL NOT NULL CHECK(total_amount >= 0),
          payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partially_paid', 'paid')),
          paid_amount REAL NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
          notes TEXT,
          ocr_status TEXT DEFAULT 'manual' CHECK(ocr_status IN ('pending', 'completed', 'failed', 'manual')),
          ocr_raw_text TEXT,
          ocr_confidence REAL,
          created_by TEXT NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 3. Create bill_attachments table
      db.exec(`
        CREATE TABLE IF NOT EXISTS bill_attachments (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          bill_id TEXT NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
          storage_key TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          content_type TEXT NOT NULL,
          file_size_bytes INTEGER NOT NULL,
          uploaded_by TEXT NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL
        );
      `);

      // 4. Create performance indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_vendors_biz_name ON vendors(business_id, name);
        CREATE INDEX IF NOT EXISTS idx_vendors_biz_phone ON vendors(business_id, phone);
        CREATE INDEX IF NOT EXISTS idx_vendors_biz_gstin ON vendors(business_id, gstin);
        CREATE INDEX IF NOT EXISTS idx_vendors_biz_cat ON vendors(business_id, category);
        CREATE INDEX IF NOT EXISTS idx_vendor_bills_biz_vendor ON vendor_bills(business_id, vendor_id);
        CREATE INDEX IF NOT EXISTS idx_vendor_bills_expense ON vendor_bills(expense_id);
        CREATE INDEX IF NOT EXISTS idx_vendor_bills_date ON vendor_bills(business_id, bill_date DESC);
        CREATE INDEX IF NOT EXISTS idx_bill_attachments_bill ON bill_attachments(bill_id);
      `);

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '002_vendor_management_and_bills',
        new Date().toISOString()
      );
    })();
    console.log('Migration 002_vendor_management_and_bills applied successfully.');
  } else {
    console.log('Migration 002_vendor_management_and_bills already applied.');
  }

  // Migration 003: Gemini API Key Setting
  if (!appliedMigrations.includes('003_gemini_api_key_setting')) {
    console.log('Applying migration: 003_gemini_api_key_setting...');
    db.transaction(() => {
      const settingsCols = db.prepare('PRAGMA table_info(business_settings)').all().map(c => c.name);
      if (!settingsCols.includes('gemini_api_key')) {
        db.exec('ALTER TABLE business_settings ADD COLUMN gemini_api_key TEXT;');
      }
      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '003_gemini_api_key_setting',
        new Date().toISOString()
      );
    })();
    console.log('Migration 003_gemini_api_key_setting applied successfully.');
  } else {
    console.log('Migration 003_gemini_api_key_setting already applied.');
  }

  return true;
}

// Allow standalone execution via `node server/db/migrate.js`
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  try {
    runMigrations();
    console.log('All migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

export default runMigrations;

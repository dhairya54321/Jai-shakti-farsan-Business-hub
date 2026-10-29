import crypto from 'crypto';
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

      // Ensure base business and default admin exist for foreign keys across migrations
      const now = new Date().toISOString();
      db.prepare(`
        INSERT OR IGNORE INTO businesses (id, name, currency_code, timezone, default_language, created_at, updated_at)
        VALUES ('biz_jaishakti_001', 'Jai Shakti Farsan Mart', 'INR', 'Asia/Kolkata', 'gu', ?, ?)
      `).run(now, now);
      db.prepare(`
        INSERT OR IGNORE INTO users (id, username, password_hash, full_name, preferred_language, is_active, created_at, updated_at)
        VALUES ('usr_owner_001', 'admin', 'placeholder', 'Owner', 'gu', 1, ?, ?)
      `).run(now, now);

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

  // Migration 004: Worker Khata & Attendance Ledger
  if (!appliedMigrations.includes('004_worker_khata_and_attendance')) {
    console.log('Applying migration: 004_worker_khata_and_attendance...');
    db.transaction(() => {
      // 1. Create workers table
      db.exec(`
        CREATE TABLE IF NOT EXISTS workers (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          phone TEXT,
          alternate_phone TEXT,
          role_title TEXT NOT NULL DEFAULT 'farsan_karigar',
          wage_type TEXT NOT NULL DEFAULT 'monthly' CHECK(wage_type IN ('monthly', 'daily')),
          base_salary REAL NOT NULL DEFAULT 0 CHECK(base_salary >= 0),
          joining_date TEXT,
          address TEXT,
          id_proof_number TEXT,
          notes TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_by TEXT REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 2. Create worker_transactions table
      db.exec(`
        CREATE TABLE IF NOT EXISTS worker_transactions (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
          transaction_type TEXT NOT NULL CHECK(transaction_type IN ('advance_given', 'advance_returned', 'salary_paid', 'salary_earned', 'bonus', 'deduction')),
          amount REAL NOT NULL CHECK(amount > 0),
          transaction_date TEXT NOT NULL,
          payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
          notes TEXT,
          expense_id TEXT REFERENCES expenses(id) ON DELETE SET NULL,
          settlement_period TEXT,
          recorded_by TEXT REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 3. Create worker_attendance table
      db.exec(`
        CREATE TABLE IF NOT EXISTS worker_attendance (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present', 'absent', 'half_day', 'leave')),
          notes TEXT,
          recorded_by TEXT REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(business_id, worker_id, date)
        );
      `);

      // 4. Create performance indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_workers_biz_name ON workers(business_id, name);
        CREATE INDEX IF NOT EXISTS idx_workers_biz_active ON workers(business_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_wtx_biz_worker ON worker_transactions(business_id, worker_id);
        CREATE INDEX IF NOT EXISTS idx_wtx_date ON worker_transactions(business_id, transaction_date DESC);
        CREATE INDEX IF NOT EXISTS idx_wtx_type ON worker_transactions(business_id, transaction_type);
        CREATE INDEX IF NOT EXISTS idx_watt_biz_date ON worker_attendance(business_id, date);
        CREATE INDEX IF NOT EXISTS idx_watt_worker_date ON worker_attendance(business_id, worker_id, date);
      `);

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '004_worker_khata_and_attendance',
        new Date().toISOString()
      );
    })();
    console.log('Migration 004_worker_khata_and_attendance applied successfully.');
  } else {
    console.log('Migration 004_worker_khata_and_attendance already applied.');
  }

  // Migration 005: Worker Portal, PIN login & Diary Features (Farsan Upad, Leave & Cycles)
  if (!appliedMigrations.includes('005_worker_portal_and_diary_features')) {
    console.log('Applying migration: 005_worker_portal_and_diary_features...');
    db.transaction(() => {
      // 1. Extend workers table with login_pin, salary_cycle_day, initial_advance, diary_page
      const workerCols = db.prepare('PRAGMA table_info(workers)').all().map(c => c.name);
      if (!workerCols.includes('login_pin')) {
        db.exec("ALTER TABLE workers ADD COLUMN login_pin TEXT DEFAULT '1234';");
      }
      if (!workerCols.includes('salary_cycle_day')) {
        db.exec("ALTER TABLE workers ADD COLUMN salary_cycle_day INTEGER NOT NULL DEFAULT 1;");
      }
      if (!workerCols.includes('initial_advance')) {
        db.exec("ALTER TABLE workers ADD COLUMN initial_advance REAL NOT NULL DEFAULT 0;");
      }
      if (!workerCols.includes('diary_page')) {
        db.exec("ALTER TABLE workers ADD COLUMN diary_page INTEGER DEFAULT 1;");
      }

      // 2. Extend worker_transactions with category_type and farsan_items
      const txCols = db.prepare('PRAGMA table_info(worker_transactions)').all().map(c => c.name);
      if (!txCols.includes('category_type')) {
        db.exec("ALTER TABLE worker_transactions ADD COLUMN category_type TEXT DEFAULT 'cash';");
      }
      if (!txCols.includes('farsan_items')) {
        db.exec("ALTER TABLE worker_transactions ADD COLUMN farsan_items TEXT;");
      }

      // 3. Create worker_leaves table
      db.exec(`
        CREATE TABLE IF NOT EXISTS worker_leaves (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          total_days REAL NOT NULL CHECK(total_days > 0),
          reason TEXT,
          deduction_amount REAL NOT NULL DEFAULT 0,
          is_approved INTEGER NOT NULL DEFAULT 1,
          recorded_by TEXT REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_leaves_biz_worker ON worker_leaves(business_id, worker_id);
        CREATE INDEX IF NOT EXISTS idx_leaves_date ON worker_leaves(business_id, start_date DESC);
      `);

      // 4. Populate / sync the 8 real staff members from the dad's diary index
      const BIZ_ID = 'biz_jaishakti_001';
      const now = new Date().toISOString();

      const diaryStaff = [
        {
          name: 'Narvat Katila (નરવત)',
          phone: '9978291287',
          role_title: 'counter_sales',
          salary_cycle_day: 17,
          base_salary: 13500,
          diary_page: 1,
          pin: '1234',
          notes: 'દાદાની ડાયરી: પાના નં. ૧ થી ૧૨'
        },
        {
          name: 'Ramesh Maharaj (રમેશ)',
          phone: '9825100002',
          role_title: 'head_chef',
          salary_cycle_day: 7,
          base_salary: 14000,
          diary_page: 13,
          pin: '1234',
          notes: 'દાદાની ડાયરી: પાના નં. ૧૩ થી ૨૨ (મુખ્ય રસોઈયા)'
        },
        {
          name: 'Munno (મુન્નો)',
          phone: '9825100003',
          role_title: 'farsan_karigar',
          salary_cycle_day: 1,
          base_salary: 15000,
          diary_page: 23,
          pin: '1234',
          notes: 'દાદાની ડાયરી: પાના નં. ૨૩ થી ૩૧'
        },
        {
          name: 'Vasant (વસંત)',
          phone: '9825100004',
          role_title: 'helper_cleaning',
          salary_cycle_day: 1,
          base_salary: 12000,
          diary_page: 32,
          pin: '1234',
          notes: 'દાદાની ડાયરી: પાના નં. ૩૨ થી ૪૭'
        },
        {
          name: 'Renukaben (રેણુકાબેન)',
          phone: '9825100005',
          role_title: 'packing_staff',
          salary_cycle_day: 1,
          base_salary: 11000,
          diary_page: 48,
          pin: '1234',
          notes: 'દાદાની ડાયરી: પાના નં. ૪૮ થી ૫૮'
        },
        {
          name: 'Madan (મદન)',
          phone: '9825100006',
          role_title: 'farsan_karigar',
          salary_cycle_day: 1,
          base_salary: 16000,
          diary_page: 59,
          pin: '1234',
          notes: 'દાદાની ડાયરી: પાના નં. ૫૯ થી ૬૩'
        },
        {
          name: 'Vishal (વિશાલ)',
          phone: '9825100007',
          role_title: 'counter_sales',
          salary_cycle_day: 1,
          base_salary: 13000,
          diary_page: 64,
          pin: '1234',
          notes: 'દાદાની ડાયરી: પાના નં. ૬૪ થી ૬૫'
        },
        {
          name: 'Hansaben (હંસાબેન)',
          phone: '9825100008',
          role_title: 'packing_staff',
          salary_cycle_day: 1,
          base_salary: 11000,
          diary_page: 66,
          pin: '1234',
          notes: 'દાદાની ડાયરી: પાના નં. ૬૬ થી આગળ'
        }
      ];

      for (const s of diaryStaff) {
        const existing = db.prepare(`
          SELECT id FROM workers 
          WHERE business_id = ? AND (phone = ? OR UPPER(TRIM(name)) LIKE UPPER(?))
        `).get(BIZ_ID, s.phone, `%${s.name.split(' ')[0]}%`);

        if (existing) {
          db.prepare(`
            UPDATE workers SET
              name = ?,
              role_title = ?,
              salary_cycle_day = ?,
              base_salary = CASE WHEN base_salary = 0 THEN ? ELSE base_salary END,
              diary_page = ?,
              login_pin = COALESCE(login_pin, ?),
              notes = COALESCE(notes, ?),
              updated_at = ?
            WHERE id = ?
          `).run(s.name, s.role_title, s.salary_cycle_day, s.base_salary, s.diary_page, s.pin, s.notes, now, existing.id);
        } else {
          db.prepare(`
            INSERT INTO workers (
              id, business_id, name, phone, role_title, wage_type,
              base_salary, salary_cycle_day, diary_page, login_pin, joining_date,
              notes, is_active, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'monthly', ?, ?, ?, ?, ?, ?, 1, 'usr_owner_001', ?, ?)
          `).run(
            'wrk_' + crypto.randomUUID(),
            BIZ_ID,
            s.name,
            s.phone,
            s.role_title,
            s.base_salary,
            s.salary_cycle_day,
            s.diary_page,
            s.pin,
            '2025-01-01',
            s.notes,
            now,
            now
          );
        }
      }

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '005_worker_portal_and_diary_features',
        new Date().toISOString()
      );
    })();
    console.log('Migration 005_worker_portal_and_diary_features applied successfully.');
  } else {
    console.log('Migration 005_worker_portal_and_diary_features already applied.');
  }

  // Migration 006: Link Expenses with Worker Khata
  if (!appliedMigrations.includes('006_link_expense_worker')) {
    console.log('Applying migration: 006_link_expense_worker...');
    db.transaction(() => {
      // 1. Add worker_id column to expenses if it does not exist
      const expenseColumns = db.prepare('PRAGMA table_info(expenses)').all().map(c => c.name);
      if (!expenseColumns.includes('worker_id')) {
        db.exec('ALTER TABLE expenses ADD COLUMN worker_id TEXT REFERENCES workers(id)');
      }

      // 2. Indexes for fast lookup
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_expenses_biz_worker ON expenses(business_id, worker_id);
        CREATE INDEX IF NOT EXISTS idx_worker_tx_expense ON worker_transactions(expense_id);
      `);

      // 3. Backfill existing worker advance expenses
      const workers = db.prepare('SELECT id, name FROM workers').all();
      for (const w of workers) {
        db.prepare(`
          UPDATE expenses 
          SET worker_id = ?
          WHERE worker_id IS NULL AND (
            notes LIKE ? OR description LIKE ?
          )
        `).run(w.id, `%Worker ID: ${w.id}%`, `%${w.name}%`);
      }

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '006_link_expense_worker',
        new Date().toISOString()
      );
    })();
    console.log('Migration 006_link_expense_worker applied successfully.');
  } else {
    console.log('Migration 006_link_expense_worker already applied.');
  }

  // Migration 007: Custom Team Member Permissions
  if (!appliedMigrations.includes('007_user_custom_permissions')) {
    console.log('Applying migration: 007_user_custom_permissions...');
    db.transaction(() => {
      const bmColumns = db.prepare('PRAGMA table_info(business_members)').all().map(c => c.name);
      if (!bmColumns.includes('permissions')) {
        db.exec('ALTER TABLE business_members ADD COLUMN permissions TEXT');
      }

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '007_user_custom_permissions',
        new Date().toISOString()
      );
    })();
    console.log('Migration 007_user_custom_permissions applied successfully.');
  } else {
    console.log('Migration 007_user_custom_permissions already applied.');
  }

  // Migration 008: Manufacturing, Recipe Vault & Raw Materials Stock System
  if (!appliedMigrations.includes('008_manufacturing_recipes_and_stock')) {
    console.log('Applying migration: 008_manufacturing_recipes_and_stock...');
    db.transaction(() => {
      // 1. Add recipe_vault_pin to business_settings if not present
      const settingsCols = db.prepare('PRAGMA table_info(business_settings)').all().map(c => c.name);
      if (!settingsCols.includes('recipe_vault_pin')) {
        db.exec("ALTER TABLE business_settings ADD COLUMN recipe_vault_pin TEXT DEFAULT '1984';");
      }

      // 2. Create raw_materials table
      db.exec(`
        CREATE TABLE IF NOT EXISTS raw_materials (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          name_en TEXT NOT NULL,
          name_gu TEXT NOT NULL,
          category TEXT NOT NULL CHECK(category IN ('flour', 'oil', 'spice', 'vegetable', 'fuel', 'packaging', 'other')),
          primary_unit TEXT NOT NULL CHECK(primary_unit IN ('tin_15kg', 'bag_25kg', 'bag_50kg', 'kg', 'g', 'cylinder_19kg', 'piece', 'box')),
          base_unit TEXT NOT NULL DEFAULT 'kg' CHECK(base_unit IN ('kg', 'g', 'cylinder', 'piece', 'box')),
          unit_ratio REAL NOT NULL DEFAULT 1,
          current_stock REAL NOT NULL DEFAULT 0,
          min_stock_alert REAL NOT NULL DEFAULT 0,
          cost_per_unit REAL DEFAULT 0,
          supplier_vendor_id TEXT REFERENCES vendors(id),
          notes TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 3. Create recipes table
      db.exec(`
        CREATE TABLE IF NOT EXISTS recipes (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          name_en TEXT NOT NULL,
          name_gu TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'daily_farsan' CHECK(category IN ('daily_farsan', 'festive_sweet', 'dry_snack', 'namkeen', 'other')),
          base_batch_size REAL NOT NULL DEFAULT 10 CHECK(base_batch_size > 0),
          batch_unit TEXT NOT NULL DEFAULT 'kg',
          prep_time_minutes INTEGER DEFAULT 60,
          chef_notes TEXT,
          photo_url TEXT,
          is_frequent INTEGER NOT NULL DEFAULT 1,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_by TEXT REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 4. Create recipe_ingredients table
      db.exec(`
        CREATE TABLE IF NOT EXISTS recipe_ingredients (
          id TEXT PRIMARY KEY,
          recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
          raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
          quantity REAL NOT NULL CHECK(quantity > 0),
          unit TEXT NOT NULL DEFAULT 'kg',
          sort_order INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT NOT NULL
        );
      `);

      // 5. Create production_batches table
      db.exec(`
        CREATE TABLE IF NOT EXISTS production_batches (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          batch_number TEXT NOT NULL,
          recipe_id TEXT NOT NULL REFERENCES recipes(id),
          product_name_en TEXT NOT NULL,
          product_name_gu TEXT NOT NULL,
          target_weight REAL NOT NULL CHECK(target_weight > 0),
          weight_unit TEXT NOT NULL DEFAULT 'kg',
          scale_factor REAL NOT NULL DEFAULT 1.0,
          production_date TEXT NOT NULL,
          chef_id TEXT REFERENCES users(id),
          chef_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('in_progress', 'completed', 'cancelled')),
          notes TEXT,
          created_by TEXT NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 6. Create batch_consumptions table
      db.exec(`
        CREATE TABLE IF NOT EXISTS batch_consumptions (
          id TEXT PRIMARY KEY,
          batch_id TEXT NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
          raw_material_id TEXT NOT NULL REFERENCES raw_materials(id),
          material_name_en TEXT NOT NULL,
          material_name_gu TEXT NOT NULL,
          required_quantity REAL NOT NULL,
          actual_quantity REAL NOT NULL,
          unit TEXT NOT NULL,
          is_checked INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );
      `);

      // 7. Create stock_transactions table
      db.exec(`
        CREATE TABLE IF NOT EXISTS stock_transactions (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
          transaction_type TEXT NOT NULL CHECK(transaction_type IN ('inward_ocr', 'inward_manual', 'outward_production', 'adjustment_loss', 'adjustment_gain')),
          quantity REAL NOT NULL,
          unit TEXT NOT NULL,
          base_quantity REAL NOT NULL,
          stock_before REAL NOT NULL,
          stock_after REAL NOT NULL,
          reference_id TEXT,
          reference_type TEXT,
          notes TEXT,
          recorded_by TEXT NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL
        );
      `);

      // 8. Performance Indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_raw_mat_biz ON raw_materials(business_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_recipes_biz ON recipes(business_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_recipe_ing_recipe ON recipe_ingredients(recipe_id);
        CREATE INDEX IF NOT EXISTS idx_prod_batches_biz_date ON production_batches(business_id, production_date DESC);
        CREATE INDEX IF NOT EXISTS idx_batch_consump_batch ON batch_consumptions(batch_id);
        CREATE INDEX IF NOT EXISTS idx_stock_tx_biz_mat ON stock_transactions(business_id, raw_material_id, created_at DESC);
      `);

      // 9. Seed default initial raw materials and classic farsan recipes
      const BIZ_ID = 'biz_jaishakti_001';
      const now = new Date().toISOString();

      const existingMaterials = db.prepare('SELECT COUNT(*) as count FROM raw_materials WHERE business_id = ?').get(BIZ_ID);
      if (!existingMaterials || existingMaterials.count === 0) {
        const initialMaterials = [
          { id: 'rm_besan_01', en: 'Besan (Gram Flour)', gu: 'બેસન / ચણાનો લોટ', cat: 'flour', pUnit: 'bag_50kg', bUnit: 'kg', ratio: 50, stock: 350, alert: 100 },
          { id: 'rm_maida_01', en: 'Maida (Refined Wheat Flour)', gu: 'મેંદો', cat: 'flour', pUnit: 'bag_50kg', bUnit: 'kg', ratio: 50, stock: 200, alert: 50 },
          { id: 'rm_singtel_01', en: 'Singtel (Groundnut Oil)', gu: 'સીંગતેલ', cat: 'oil', pUnit: 'tin_15kg', bUnit: 'kg', ratio: 15, stock: 120, alert: 30 },
          { id: 'rm_cottonseed_01', en: 'Cottonseed Oil (Kapasya)', gu: 'કપાસિયા તેલ', cat: 'oil', pUnit: 'tin_15kg', bUnit: 'kg', ratio: 15, stock: 150, alert: 30 },
          { id: 'rm_potato_01', en: 'Potatoes (Batata)', gu: 'બટાકા', cat: 'vegetable', pUnit: 'bag_50kg', bUnit: 'kg', ratio: 50, stock: 150, alert: 50 },
          { id: 'rm_chilly_01', en: 'Green Chillies (Lila Marcha)', gu: 'લીલા મરચાં', cat: 'vegetable', pUnit: 'kg', bUnit: 'kg', ratio: 1, stock: 20, alert: 5 },
          { id: 'rm_sugar_01', en: 'Sugar (Khand)', gu: 'ખાંડ', cat: 'spice', pUnit: 'bag_50kg', bUnit: 'kg', ratio: 50, stock: 200, alert: 50 },
          { id: 'rm_til_01', en: 'Sesame Seeds (Tal/Til)', gu: 'તલ (સફેદ)', cat: 'spice', pUnit: 'kg', bUnit: 'kg', ratio: 1, stock: 35, alert: 10 },
          { id: 'rm_kopra_01', en: 'Coconut Flakes (Kopra Khaman)', gu: 'કોપરા ખમણ', cat: 'spice', pUnit: 'kg', bUnit: 'kg', ratio: 1, stock: 25, alert: 8 },
          { id: 'rm_garam_masala_01', en: 'Garam Masala (Farsan Special)', gu: 'ગરમ મસાલો', cat: 'spice', pUnit: 'kg', bUnit: 'kg', ratio: 1, stock: 15, alert: 3 },
          { id: 'rm_ajwain_01', en: 'Ajwain (Carom Seeds)', gu: 'અજમો', cat: 'spice', pUnit: 'kg', bUnit: 'kg', ratio: 1, stock: 12, alert: 2 },
          { id: 'rm_hing_01', en: 'Hing (Asafoetida)', gu: 'હીંગ', cat: 'spice', pUnit: 'kg', bUnit: 'kg', ratio: 1, stock: 5, alert: 1 },
          { id: 'rm_salt_01', en: 'Salt (Mithu)', gu: 'મીઠું', cat: 'spice', pUnit: 'kg', bUnit: 'kg', ratio: 1, stock: 100, alert: 20 },
          { id: 'rm_turmeric_01', en: 'Turmeric Powder (Haldar)', gu: 'હળદર', cat: 'spice', pUnit: 'kg', bUnit: 'kg', ratio: 1, stock: 18, alert: 4 },
          { id: 'rm_gas_cylinder_01', en: 'Commercial LPG Cylinder (19 Kg)', gu: 'કોમર્શિયલ ગેસ બાટલો (૧૯ કિલો)', cat: 'fuel', pUnit: 'cylinder_19kg', bUnit: 'cylinder', ratio: 1, stock: 6, alert: 2 },
          { id: 'rm_pouch_500g_01', en: 'Farsan Pouch (500g Printed)', gu: 'પેકિંગ પાઉચ (૫૦૦ ગ્રામ)', cat: 'packaging', pUnit: 'piece', bUnit: 'piece', ratio: 1, stock: 1200, alert: 300 },
          { id: 'rm_sweet_box_1kg_01', en: 'Sweets Box (1 Kg Golden)', gu: 'મીઠાઈ બોક્સ (૧ કિલો)', cat: 'packaging', pUnit: 'box', bUnit: 'box', ratio: 1, stock: 450, alert: 100 }
        ];

        const insertMat = db.prepare(`
          INSERT INTO raw_materials (
            id, business_id, name_en, name_gu, category, primary_unit, base_unit,
            unit_ratio, current_stock, min_stock_alert, cost_per_unit, is_active,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
        `);

        for (const m of initialMaterials) {
          insertMat.run(m.id, BIZ_ID, m.en, m.gu, m.cat, m.pUnit, m.bUnit, m.ratio, m.stock, m.alert, now, now);
        }
      }

      const existingRecipes = db.prepare('SELECT COUNT(*) as count FROM recipes WHERE business_id = ?').get(BIZ_ID);
      if (!existingRecipes || existingRecipes.count === 0) {
        const initialRecipes = [
          {
            id: 'rcp_bhakharwadi_01',
            en: 'Bhakharwadi',
            gu: 'ભાખરવડી',
            cat: 'daily_farsan',
            base_size: 10,
            frequent: 1,
            notes: 'Roll dough tightly with seasoned masala stuffing. Rest rolls 15 minutes before spiral slicing. Deep fry on medium steady flame (160°C) until deep golden crisp. Do not overcrowd kadai.',
            ingredients: [
              { matId: 'rm_maida_01', qty: 4.0, unit: 'kg' },
              { matId: 'rm_besan_01', qty: 1.0, unit: 'kg' },
              { matId: 'rm_singtel_01', qty: 2.0, unit: 'kg' },
              { matId: 'rm_til_01', qty: 0.6, unit: 'kg' },
              { matId: 'rm_kopra_01', qty: 0.8, unit: 'kg' },
              { matId: 'rm_sugar_01', qty: 0.5, unit: 'kg' },
              { matId: 'rm_garam_masala_01', qty: 0.3, unit: 'kg' },
              { matId: 'rm_chilly_01', qty: 0.25, unit: 'kg' },
              { matId: 'rm_salt_01', qty: 0.15, unit: 'kg' },
              { matId: 'rm_turmeric_01', qty: 0.05, unit: 'kg' },
              { matId: 'rm_hing_01', qty: 0.02, unit: 'kg' }
            ]
          },
          {
            id: 'rcp_chevdo_01',
            en: 'Lilo / Suko Chevdo',
            gu: 'લીલો / સૂકો ચેવડો',
            cat: 'daily_farsan',
            base_size: 10,
            frequent: 1,
            notes: 'Shred fresh potatoes into cold water, wash twice to remove surface starch. Dry thoroughly on clean muslin cloth before hot frying. Dust sweet-sour seasoning immediately out of hot oil while warm.',
            ingredients: [
              { matId: 'rm_potato_01', qty: 6.0, unit: 'kg' },
              { matId: 'rm_cottonseed_01', qty: 1.8, unit: 'kg' },
              { matId: 'rm_sugar_01', qty: 0.8, unit: 'kg' },
              { matId: 'rm_til_01', qty: 0.4, unit: 'kg' },
              { matId: 'rm_chilly_01', qty: 0.3, unit: 'kg' },
              { matId: 'rm_salt_01', qty: 0.15, unit: 'kg' },
              { matId: 'rm_turmeric_01', qty: 0.05, unit: 'kg' }
            ]
          },
          {
            id: 'rcp_khaman_01',
            en: 'Nylon Khaman Dhokla',
            gu: 'નાયલોન ખમણ ઢોકળા',
            cat: 'daily_farsan',
            base_size: 10,
            frequent: 1,
            notes: 'Beat besan batter vigorously for 10 minutes until fluffy and pale yellow. Steam for exactly 18 minutes on high pressure. Vaghar with mustard seeds, curry leaves, and green chillies with sweet water.',
            ingredients: [
              { matId: 'rm_besan_01', qty: 5.0, unit: 'kg' },
              { matId: 'rm_sugar_01', qty: 1.0, unit: 'kg' },
              { matId: 'rm_singtel_01', qty: 0.8, unit: 'kg' },
              { matId: 'rm_chilly_01', qty: 0.3, unit: 'kg' },
              { matId: 'rm_til_01', qty: 0.2, unit: 'kg' },
              { matId: 'rm_salt_01', qty: 0.15, unit: 'kg' },
              { matId: 'rm_hing_01', qty: 0.03, unit: 'kg' }
            ]
          },
          {
            id: 'rcp_gathiya_01',
            en: 'Bhavnagari Gathiya',
            gu: 'ભાવનગરી ગાંઠિયા',
            cat: 'daily_farsan',
            base_size: 10,
            frequent: 1,
            notes: 'Prepare ultra-soft dough with soda-oil emulsion. Press directly into hot oil with traditional wooden jhara. Keep flame steady low-to-medium for signature soft, melting texture.',
            ingredients: [
              { matId: 'rm_besan_01', qty: 7.0, unit: 'kg' },
              { matId: 'rm_cottonseed_01', qty: 2.0, unit: 'kg' },
              { matId: 'rm_ajwain_01', qty: 0.2, unit: 'kg' },
              { matId: 'rm_salt_01', qty: 0.2, unit: 'kg' },
              { matId: 'rm_hing_01', qty: 0.04, unit: 'kg' }
            ]
          },
          {
            id: 'rcp_kaju_katli_01',
            en: 'Festive Kaju Katli',
            gu: 'કાજુ કતરી (તહેવાર સ્પેશિયલ)',
            cat: 'festive_sweet',
            base_size: 10,
            frequent: 0,
            notes: 'Exact 1-tar sugar syrup (chashni). Mix fine ground cashew powder. Knead warm fudge smooth without letting oil separate. Roll thin between greased sheets and diamond cut.',
            ingredients: [
              { matId: 'rm_sugar_01', qty: 4.5, unit: 'kg' },
              { matId: 'rm_til_01', qty: 6.0, unit: 'kg' }
            ]
          }
        ];

        const insertRcp = db.prepare(`
          INSERT INTO recipes (
            id, business_id, name_en, name_gu, category, base_batch_size, batch_unit,
            prep_time_minutes, chef_notes, is_frequent, is_active, created_by,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'kg', 60, ?, ?, 1, 'usr_owner_001', ?, ?)
        `);

        const insertIng = db.prepare(`
          INSERT INTO recipe_ingredients (
            id, recipe_id, raw_material_id, quantity, unit, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const r of initialRecipes) {
          insertRcp.run(r.id, BIZ_ID, r.en, r.gu, r.cat, r.base_size, r.notes, r.frequent, now, now);
          r.ingredients.forEach((ing, idx) => {
            insertIng.run('ing_' + crypto.randomUUID(), r.id, ing.matId, ing.qty, ing.unit, idx + 1, now);
          });
        }
      }

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '008_manufacturing_recipes_and_stock',
        new Date().toISOString()
      );
    })();
    console.log('Migration 008_manufacturing_recipes_and_stock applied successfully.');
  } else {
    console.log('Migration 008_manufacturing_recipes_and_stock already applied.');
  }

  // Migration 009: Scanned Worker Diary History
  if (!appliedMigrations.includes('009_worker_diary_scans')) {
    console.log('Applying migration: 009_worker_diary_scans...');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS worker_diary_scans (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
          file_path TEXT NOT NULL,
          original_name TEXT,
          mime_type TEXT,
          file_size INTEGER,
          diary_page TEXT,
          notes TEXT,
          uploaded_by TEXT REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_diary_scans_worker ON worker_diary_scans(business_id, worker_id, created_at DESC);
      `);

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '009_worker_diary_scans',
        new Date().toISOString()
      );
    })();
    console.log('Migration 009_worker_diary_scans applied successfully.');
  } else {
    console.log('Migration 009_worker_diary_scans already applied.');
  }

  // Migration 010: Sync existing expenses with vendor_id to vendor_bills and bill_attachments
  if (!appliedMigrations.includes('010_sync_vendor_bills_and_expenses')) {
    console.log('Applying migration: 010_sync_vendor_bills_and_expenses...');
    db.transaction(() => {
      const vendorExpenses = db.prepare(`
        SELECT e.*, 
               a.storage_key as att_storage_key,
               a.original_filename as att_original_filename,
               a.content_type as att_content_type,
               a.file_size_bytes as att_file_size_bytes
        FROM expenses e
        LEFT JOIN expense_attachments a ON a.expense_id = e.id
        WHERE e.vendor_id IS NOT NULL AND e.approval_status != 'voided'
      `).all();

      for (const exp of vendorExpenses) {
        // 1. Check if a bill already has this expense_id
        const existingByExp = db.prepare('SELECT id FROM vendor_bills WHERE expense_id = ?').get(exp.id);
        if (existingByExp) continue;

        // 2. Check if a bill exists for same vendor and same bill_number
        let existingBill = null;
        if (exp.invoice_number && String(exp.invoice_number).trim()) {
          existingBill = db.prepare(`
            SELECT id FROM vendor_bills 
            WHERE vendor_id = ? AND UPPER(TRIM(COALESCE(bill_number, ''))) = UPPER(TRIM(?))
          `).get(exp.vendor_id, exp.invoice_number);
        }

        if (existingBill) {
          // Link existing bill to this expense
          db.prepare('UPDATE vendor_bills SET expense_id = ?, updated_at = ? WHERE id = ?').run(
            exp.id,
            new Date().toISOString(),
            existingBill.id
          );
        } else {
          // Create missing vendor_bills record
          const billId = 'bill_' + crypto.randomUUID();
          const now = new Date().toISOString();
          db.prepare(`
            INSERT INTO vendor_bills (
              id, business_id, vendor_id, expense_id, bill_number, bill_date,
              subtotal, taxable_amount, total_amount, payment_status, paid_amount,
              notes, ocr_status, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            billId,
            exp.business_id,
            exp.vendor_id,
            exp.id,
            exp.invoice_number ? String(exp.invoice_number).trim() : null,
            exp.transaction_date,
            exp.amount,
            exp.amount,
            exp.amount,
            exp.payment_status || 'paid',
            exp.payment_status === 'paid' ? exp.amount : 0,
            exp.description || exp.notes || null,
            exp.att_storage_key ? 'completed' : 'manual',
            exp.created_by,
            exp.created_at || now,
            now
          );

          // Copy attachment if present
          if (exp.att_storage_key) {
            const billAttId = 'bat_' + crypto.randomUUID();
            db.prepare(`
              INSERT INTO bill_attachments (
                id, business_id, bill_id, storage_key, original_filename,
                content_type, file_size_bytes, uploaded_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              billAttId,
              exp.business_id,
              billId,
              exp.att_storage_key,
              exp.att_original_filename || exp.att_storage_key,
              exp.att_content_type || 'image/jpeg',
              exp.att_file_size_bytes || 0,
              exp.created_by,
              now
            );
          }
        }
      }

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '010_sync_vendor_bills_and_expenses',
        new Date().toISOString()
      );
    })();
    console.log('Migration 010_sync_vendor_bills_and_expenses applied successfully.');
  } else {
    console.log('Migration 010_sync_vendor_bills_and_expenses already applied.');
  }

  // Migration 011: Clean Mock Raw Materials & Seed Real Stock Exclusively From Historical Bills
  if (!appliedMigrations.includes('011_clean_mock_raw_materials_and_seed_real_stock')) {
    console.log('Applying migration: 011_clean_mock_raw_materials_and_seed_real_stock...');
    db.transaction(() => {
      const BIZ_ID = 'biz_jaishakti_001';
      const now = new Date().toISOString();

      // Temporarily disable foreign keys for clean table upgrade
      db.pragma('foreign_keys = OFF');

      // 1. Wipe mock stock transactions & mock batch consumptions
      const mockIds = [
        'rm_besan_01', 'rm_sugar_01', 'rm_til_01', 'rm_gas_cylinder_01',
        'rm_singtel_01', 'rm_cottonseed_01', 'rm_potato_01', 'rm_chilly_01',
        'rm_kopra_01', 'rm_garam_masala_01', 'rm_ajwain_01', 'rm_hing_01',
        'rm_salt_01', 'rm_turmeric_01', 'rm_pouch_500g_01', 'rm_sweet_box_1kg_01',
        'rm_maida_01'
      ];
      const mockInClause = mockIds.map(id => `'${id}'`).join(',');
      db.prepare(`DELETE FROM stock_transactions WHERE raw_material_id IN (${mockInClause})`).run();
      db.prepare(`DELETE FROM batch_consumptions WHERE raw_material_id IN (${mockInClause})`).run();

      // 2. Rebuild raw_materials table with flexible category and unit checks
      db.exec(`
        CREATE TABLE IF NOT EXISTS raw_materials_clean (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          name_en TEXT NOT NULL,
          name_gu TEXT NOT NULL,
          category TEXT NOT NULL CHECK(category IN ('flour', 'oil', 'spice', 'vegetable', 'fuel', 'packaging', 'trading', 'other')),
          primary_unit TEXT NOT NULL CHECK(primary_unit IN ('tin_15kg', 'bag_25kg', 'bag_30kg', 'bag_50kg', 'kg', 'g', 'cylinder_19kg', 'piece', 'pkt', 'box', 'dabba', 'katta')),
          base_unit TEXT NOT NULL DEFAULT 'kg' CHECK(base_unit IN ('kg', 'g', 'cylinder', 'piece', 'box')),
          unit_ratio REAL NOT NULL DEFAULT 1,
          current_stock REAL NOT NULL DEFAULT 0,
          min_stock_alert REAL NOT NULL DEFAULT 0,
          cost_per_unit REAL DEFAULT 0,
          supplier_vendor_id TEXT REFERENCES vendors(id),
          notes TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        DROP TABLE IF EXISTS raw_materials;
        ALTER TABLE raw_materials_clean RENAME TO raw_materials;
        CREATE INDEX IF NOT EXISTS idx_raw_mat_biz ON raw_materials(business_id, is_active);
      `);

      // 3. Define Real Raw Materials derived exclusively from historical bills & expenses
      const realMaterials = [
        // --- Oils & Ghee ---
        {
          id: 'rm_cottonseed_rani_15kg',
          en: 'Cottonseed Oil (Rani 15kg Tin)',
          gu: 'કપાસિયા તેલ (રાણી ૧૫ કિલો ડબ્બો)',
          cat: 'oil',
          pUnit: 'tin_15kg',
          bUnit: 'kg',
          ratio: 15,
          stock: 450, // 30 Tins = 450 kg
          alert: 30,
          cost: 2675,
          vendorId: 'ven_6913512d-946e-47cd-9476-0ad1046ccbdf', // HARI OM TRADERS
          notes: 'Cottonseed Oil Rani 15kg: 30 Tins purchased across bills #4133 (10 Tins), #4567 (10 Tins), #332 (10 Tins)'
        },
        {
          id: 'rm_mother_dairy_ghee_15kg',
          en: 'Mother Dairy Pure Ghee (15kg Tin)',
          gu: 'મધર ડેરી શુદ્ધ ઘી (૧૫ કિલો ડબ્બો)',
          cat: 'oil',
          pUnit: 'tin_15kg',
          bUnit: 'kg',
          ratio: 15,
          stock: 30, // 2 Tins = 30 kg
          alert: 15,
          cost: 10300,
          vendorId: 'ven_67c704f9-32f5-442f-bdd0-d341577e8b23', // M/S. Gheewala Agencies
          notes: 'Mother Dairy Pure Ghee 15kg: 2 Tins (30 kg) purchased from M/S. Gheewala Agencies (Bill #1099- 26/27)'
        },

        // --- Grains & Flours ---
        {
          id: 'rm_maida_50kg',
          en: 'Maida 50kg Bags',
          gu: 'મેંદો (૫૦ કિલો કટ્ટો)',
          cat: 'flour',
          pUnit: 'bag_50kg',
          bUnit: 'kg',
          ratio: 50,
          stock: 100, // 2 Bags = 100 kg
          alert: 50,
          cost: 1851.5,
          vendorId: 'ven_d3701c5d-499e-479f-878f-10db73e865d6', // Naginlal Chimanlal Gandhi
          notes: 'Maida 50kg: 2 Bags (100 kg) purchased from Naginlal Chimanlal Gandhi (Bill #T-05920/26-27)'
        },
        {
          id: 'rm_chana_dal_30kg',
          en: 'Chana Dal 30kg Bags',
          gu: 'ચણા દાળ (૩૦ કિલો કટ્ટો)',
          cat: 'flour',
          pUnit: 'bag_30kg',
          bUnit: 'kg',
          ratio: 30,
          stock: 180, // 6 Bags = 180 kg
          alert: 30,
          cost: 3225.3,
          vendorId: 'ven_324dbdf7-c0b8-433d-95da-dea919ca93a0', // SATGURU KRUPA TRADERS
          notes: 'R Chana Dall 30kg: 6 Bags (180 kg) purchased from Satguru Krupa Traders (Bill #26-27/CR/31772)'
        },
        {
          id: 'rm_moong_doller_30kg',
          en: 'Moong Doller 30kg Bags',
          gu: 'મગ ડૉલર (૩૦ કિલો કટ્ટો)',
          cat: 'flour',
          pUnit: 'bag_30kg',
          bUnit: 'kg',
          ratio: 30,
          stock: 30, // 1 Bag = 30 kg
          alert: 30,
          cost: 3540.3,
          vendorId: 'ven_324dbdf7-c0b8-433d-95da-dea919ca93a0', // SATGURU KRUPA TRADERS
          notes: 'Moong Doller 30kg: 1 Bag (30 kg) purchased from Satguru Krupa Traders (Bill #26-27/CR/31772)'
        },

        // --- Vegetables & Spices ---
        {
          id: 'rm_potatoes_fresh',
          en: 'Potatoes (50kg Bags / Batata)',
          gu: 'બટાકા (૫૦ કિલો કટ્ટો)',
          cat: 'vegetable',
          pUnit: 'bag_50kg',
          bUnit: 'kg',
          ratio: 50,
          stock: 300, // 6 Bags = 300 kg
          alert: 50,
          cost: 1062.5,
          vendorId: 'ven_4215e4f7-ab8e-415a-9a24-6b9dc60ffacc', // M/s. Popatlal Keshavlal
          notes: 'Potatoes: 6 Bags (300 kg) purchased from M/s. Popatlal Keshavlal (Bills #SALE1009, #SALE1033, #SALE1069)'
        },
        {
          id: 'rm_kopra_sali_5pct',
          en: 'Kopra Sali 5%',
          gu: 'કોપરા છીણ / સાલી ૫%',
          cat: 'spice',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 10, // 10 kg
          alert: 3,
          cost: 245,
          vendorId: 'ven_529f606f-07da-483e-8086-fecd4d96b50f', // SATGURUKRUPA SALES
          notes: 'Kopra Sali 5%: 10 kg purchased from Satgurukrupa Sales (Bill #26-27/CR/9281)'
        },

        // --- Packaging ---
        {
          id: 'rm_pkg_pp_18x24',
          en: 'PP Bags (18x24)',
          gu: 'પી.પી. બેગ (૧૮x૨૪)',
          cat: 'packaging',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 6, // 1 kg (Bill 1307) + 5 kg (Bill 1353) = 6 kg
          alert: 2,
          cost: 225,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557', // VALLABH TRADERS
          notes: 'PP Bags 18x24: 6 kg from Vallabh Traders (Bills #1307, #1353)'
        },
        {
          id: 'rm_pkg_pp_8x10',
          en: 'PP Bags (8x10)',
          gu: 'પી.પી. બેગ (૮x૧૦)',
          cat: 'packaging',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 1,
          alert: 0.5,
          cost: 235,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'PP Bags 8x10: 1 kg from Vallabh Traders (Bill #1353)'
        },
        {
          id: 'rm_pkg_pp_5x7',
          en: 'PP Bags (5x7)',
          gu: 'પી.પી. બેગ (૫x૭)',
          cat: 'packaging',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 1,
          alert: 0.5,
          cost: 235,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'PP Bags 5x7: 1 kg from Vallabh Traders (Bill #1307)'
        },
        {
          id: 'rm_pkg_pp_6x8',
          en: 'PP Bags (6x8)',
          gu: 'પી.પી. બેગ (૬x૮)',
          cat: 'packaging',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 1,
          alert: 0.5,
          cost: 230,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'PP Bags 6x8: 1 kg from Vallabh Traders (Bill #1307)'
        },
        {
          id: 'rm_pkg_bio_9x13',
          en: 'Bio Bags (9x13)',
          gu: 'બાયો બેગ (૯x૧૩)',
          cat: 'packaging',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 1,
          alert: 0.5,
          cost: 130,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'Bio Bags 9x13: 1 kg from Vallabh Traders (Bill #1307)'
        },
        {
          id: 'rm_pkg_pouch_6x6',
          en: 'Pouches 6x6 (1/600 g)',
          gu: 'પાઉચ ૬x૬ (૧/૬૦૦ ગ્રામ)',
          cat: 'packaging',
          pUnit: 'pkt',
          bUnit: 'piece',
          ratio: 1,
          stock: 8,
          alert: 2,
          cost: 35,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'Pouches 6x6: 8 Pkt from Vallabh Traders (Bill #1359)'
        },
        {
          id: 'rm_pkg_w_4x6',
          en: 'W. Bags (4x6)',
          gu: 'ડબલ્યુ. બેગ (૪x૬)',
          cat: 'packaging',
          pUnit: 'pkt',
          bUnit: 'piece',
          ratio: 1,
          stock: 8,
          alert: 2,
          cost: 30,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'W. Bags 4x6: 8 Pkt from Vallabh Traders (Bill #1359)'
        },
        {
          id: 'rm_pkg_cups_5x7',
          en: 'Cups (5x7)',
          gu: 'કપ્સ (૫x૭)',
          cat: 'packaging',
          pUnit: 'pkt',
          bUnit: 'piece',
          ratio: 1,
          stock: 1,
          alert: 0.5,
          cost: 190,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'Cups 5x7: 1 Pkt from Vallabh Traders (Bill #1359)'
        },
        {
          id: 'rm_pkg_bag_16x20',
          en: 'Bag 16x20 MW',
          gu: 'બેગ ૧૬x૨૦ એમડબલ્યુ',
          cat: 'packaging',
          pUnit: 'pkt',
          bUnit: 'piece',
          ratio: 1,
          stock: 1,
          alert: 0.5,
          cost: 200,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'Bag 16x20 MW: 1 Pkt from Vallabh Traders (Bill #1359)'
        },
        {
          id: 'rm_pkg_14_dori',
          en: '14 Dori (Packing String)',
          gu: '૧૪ દોરી (પેકિંગ દોરી)',
          cat: 'packaging',
          pUnit: 'piece',
          bUnit: 'piece',
          ratio: 1,
          stock: 2,
          alert: 1,
          cost: 15,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: '14 Dori: 2 Pcs from Vallabh Traders (Bill #1359)'
        },
        {
          id: 'rm_pkg_pp_bag_gen',
          en: 'P.P. Bags General',
          gu: 'પી.પી. બેગ (સામાન્ય)',
          cat: 'packaging',
          pUnit: 'piece',
          bUnit: 'piece',
          ratio: 1,
          stock: 2,
          alert: 1,
          cost: 230,
          vendorId: 'ven_16cc3fe9-5666-441e-a175-47f853f53557',
          notes: 'P.P. Bags: 2 Bags from Vallabh Traders (Bill #1325)'
        },

        // --- Trading / Resale ---
        {
          id: 'rm_trade_thepla',
          en: 'Thepla',
          gu: 'થેપલા (તૈયાર માલ)',
          cat: 'trading',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 3,
          alert: 1,
          cost: 190,
          vendorId: 'ven_adfc0970-83dd-436e-baff-d5cd74a2ee1c', // KAMYA GRUH UDYOG
          notes: 'Thepla: 3 Kg from Kamya Gruh Udyog (Bill #1051)'
        },
        {
          id: 'rm_trade_khakhra_methi',
          en: 'Khakhra (Methi)',
          gu: 'ખાખરા (મેથી)',
          cat: 'trading',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 13, // 8 + 5
          alert: 3,
          cost: 200,
          vendorId: 'ven_223c1dd6-1914-4500-adaa-e143d75e2b92', // RANNA K. MISTRY
          notes: 'Khakhra Methi: 13 Kg from Ranna K. Mistry (Bills #638, #645)'
        },
        {
          id: 'rm_trade_khakhra_masala',
          en: 'Khakhra (Masala)',
          gu: 'ખાખરા (મસાલા)',
          cat: 'trading',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 7, // 2 + 5
          alert: 2,
          cost: 200,
          vendorId: 'ven_223c1dd6-1914-4500-adaa-e143d75e2b92',
          notes: 'Khakhra Masala: 7 Kg from Ranna K. Mistry (Bills #638, #645)'
        },
        {
          id: 'rm_trade_khakhra_jeera',
          en: 'Khakhra (Jeera)',
          gu: 'ખાખરા (જીરા)',
          cat: 'trading',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 5,
          alert: 2,
          cost: 220,
          vendorId: 'ven_223c1dd6-1914-4500-adaa-e143d75e2b92',
          notes: 'Khakhra Jeera: 5 Kg from Ranna K. Mistry (Bill #645)'
        },
        {
          id: 'rm_trade_mag_jor',
          en: 'Mag Jor',
          gu: 'મગ જોર (તૈયાર નાસ્તો)',
          cat: 'trading',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 5,
          alert: 2,
          cost: 175,
          vendorId: 'ven_4b2b4e6f-779d-4168-bb24-f78b78032da9', // KHUSHI FOODS
          notes: 'Mag Jor Loose: 5 Kg from Khushi Foods (Bill #571)'
        },
        {
          id: 'rm_trade_chana_jor',
          en: 'Chana Jor',
          gu: 'ચણા જોર (ગરમ મોળા)',
          cat: 'trading',
          pUnit: 'kg',
          bUnit: 'kg',
          ratio: 1,
          stock: 5,
          alert: 2,
          cost: 140,
          vendorId: 'ven_4b2b4e6f-779d-4168-bb24-f78b78032da9',
          notes: 'Chana Jor Garam Mola Loose: 5 Kg from Khushi Foods (Bill #571)'
        },
        {
          id: 'rm_trade_mari_papad',
          en: 'Mari Papad (500g)',
          gu: 'મરી પાપડ (૫૦૦ ગ્રામ)',
          cat: 'trading',
          pUnit: 'pkt',
          bUnit: 'piece',
          ratio: 1,
          stock: 10,
          alert: 3,
          cost: 129,
          vendorId: 'ven_59c153ae-4eb0-4b16-b121-fff064f7aded', // YOGI TRADERS
          notes: 'Single Mari Papad 500 Gms: 10 Pkt from Yogi Traders (Bill #1189)'
        },
        {
          id: 'rm_trade_water_bottles',
          en: 'Water Bottles',
          gu: 'પાણીની બોટલ (વિવિધ સાઈઝ)',
          cat: 'trading',
          pUnit: 'piece',
          bUnit: 'piece',
          ratio: 1,
          stock: 9,
          alert: 3,
          cost: 142,
          vendorId: 'ven_357d3c5a-2724-44bb-bd3b-ca16ccb6c60d', // Yogi Marketing
          notes: 'Mineral Water Bottles (250ml: 5, 500ml: 3, 1Ltr: 1): 9 Bottles from Yogi Marketing (Bill #1919)'
        }
      ];

      const insertMat = db.prepare(`
        INSERT INTO raw_materials (
          id, business_id, name_en, name_gu, category, primary_unit, base_unit,
          unit_ratio, current_stock, min_stock_alert, cost_per_unit,
          supplier_vendor_id, notes, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);

      const insertStx = db.prepare(`
        INSERT INTO stock_transactions (
          id, business_id, raw_material_id, transaction_type,
          quantity, unit, base_quantity, stock_before, stock_after,
          reference_id, reference_type, notes, recorded_by, created_at
        ) VALUES (?, ?, ?, 'inward_ocr', ?, ?, ?, 0, ?, ?, 'vendor_bill', ?, 'usr_owner_001', ?)
      `);

      for (const m of realMaterials) {
        const vendorExists = m.vendorId ? db.prepare('SELECT id FROM vendors WHERE id = ?').get(m.vendorId) : null;
        const validVendorId = vendorExists ? m.vendorId : null;

        insertMat.run(
          m.id, BIZ_ID, m.en, m.gu, m.cat, m.pUnit, m.bUnit,
          m.ratio, m.stock, m.alert, m.cost, validVendorId, m.notes,
          now, now
        );

        // Find associated bill from historical bills
        const bill = db.prepare(`
          SELECT id, bill_number FROM vendor_bills 
          WHERE vendor_id = ? 
          ORDER BY bill_date DESC LIMIT 1
        `).get(m.vendorId);

        const billId = bill ? bill.id : ('bill_' + crypto.randomUUID());
        const billNote = bill ? `Opening stock from historical Bill #${bill.bill_number || ''}` : m.notes;

        const primaryQty = m.pUnit.includes('bag') ? (m.stock / m.ratio) : (m.pUnit.includes('tin') ? (m.stock / m.ratio) : m.stock);

        insertStx.run(
          'stx_' + crypto.randomUUID(),
          BIZ_ID,
          m.id,
          primaryQty,
          m.pUnit,
          m.stock,
          m.stock,
          billId,
          billNote,
          now
        );
      }

      // 4. Update existing recipe ingredients to map to real materials
      const updateIng = db.prepare(`
        INSERT INTO recipe_ingredients (id, recipe_id, raw_material_id, quantity, unit, sort_order, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Bhakharwadi
      const bhakharwadi = db.prepare("SELECT id FROM recipes WHERE id = 'rcp_bhakharwadi_01'").get();
      if (bhakharwadi) {
        db.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = 'rcp_bhakharwadi_01'").run();
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_bhakharwadi_01', 'rm_maida_50kg', 4.0, 'kg', 1, 'Maida', now);
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_bhakharwadi_01', 'rm_chana_dal_30kg', 1.0, 'kg', 2, 'Chana Dal', now);
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_bhakharwadi_01', 'rm_cottonseed_rani_15kg', 2.0, 'kg', 3, 'Cottonseed Oil', now);
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_bhakharwadi_01', 'rm_kopra_sali_5pct', 0.8, 'kg', 4, 'Kopra Sali', now);
      }

      // Chevdo
      const chevdo = db.prepare("SELECT id FROM recipes WHERE id = 'rcp_chevdo_01'").get();
      if (chevdo) {
        db.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = 'rcp_chevdo_01'").run();
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_chevdo_01', 'rm_potatoes_fresh', 6.0, 'kg', 1, 'Potatoes', now);
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_chevdo_01', 'rm_cottonseed_rani_15kg', 1.8, 'kg', 2, 'Cottonseed Oil', now);
      }

      // Khaman
      const khaman = db.prepare("SELECT id FROM recipes WHERE id = 'rcp_khaman_01'").get();
      if (khaman) {
        db.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = 'rcp_khaman_01'").run();
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_khaman_01', 'rm_chana_dal_30kg', 5.0, 'kg', 1, 'Chana Dal', now);
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_khaman_01', 'rm_cottonseed_rani_15kg', 0.8, 'kg', 2, 'Cottonseed Oil', now);
      }

      // Gathiya
      const gathiya = db.prepare("SELECT id FROM recipes WHERE id = 'rcp_gathiya_01'").get();
      if (gathiya) {
        db.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = 'rcp_gathiya_01'").run();
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_gathiya_01', 'rm_chana_dal_30kg', 7.0, 'kg', 1, 'Chana Dal', now);
        updateIng.run('ing_' + crypto.randomUUID(), 'rcp_gathiya_01', 'rm_cottonseed_rani_15kg', 2.0, 'kg', 2, 'Cottonseed Oil', now);
      }

      // Clean up orphaned recipe ingredients referencing non-existent materials
      db.prepare(`DELETE FROM recipe_ingredients WHERE raw_material_id NOT IN (SELECT id FROM raw_materials)`).run();

      db.pragma('foreign_keys = ON');

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '011_clean_mock_raw_materials_and_seed_real_stock',
        now
      );
    })();
    console.log('Migration 011_clean_mock_raw_materials_and_seed_real_stock applied successfully.');
  } else {
    console.log('Migration 011_clean_mock_raw_materials_and_seed_real_stock already applied.');
  }


  // Migration 012: Add Sugar Raw Materials (Sugar 50kg & Sugar Pulverised 25kg)
  if (!appliedMigrations.includes('012_add_sugar_raw_materials')) {
    console.log('Applying migration: 012_add_sugar_raw_materials...');
    (() => {
      const now = new Date().toISOString();
      const insertRm = db.prepare(`
        INSERT OR IGNORE INTO raw_materials (
          id, business_id, name_en, name_gu, category, primary_unit,
          base_unit, unit_ratio, current_stock, min_stock_alert, cost_per_unit,
          notes, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);

      insertRm.run(
        'rm_sugar_kata_50kg',
        'biz_jaishakti_001',
        'Sugar 50kg Bags',
        'ખાંડ (૫૦ કિલો કટ્ટો)',
        'other',
        'bag_50kg',
        'kg',
        50.0,
        0,
        2,
        2380.95,
        'Purchased from M/S. Jay Agencies',
        now,
        now
      );

      insertRm.run(
        'rm_sugar_pulverised_25kg',
        'biz_jaishakti_001',
        'Sugar Pulverised Powder 25kg',
        'દળેલી ખાંડ (૨૫ કિલો કટ્ટો)',
        'other',
        'bag_25kg',
        'kg',
        25.0,
        0,
        2,
        1271.43,
        'Purchased from M/S. Jay Agencies',
        now,
        now
      );

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '012_add_sugar_raw_materials',
        now
      );
    })();
    console.log('Migration 012_add_sugar_raw_materials applied successfully.');
  } else {
    console.log('Migration 012_add_sugar_raw_materials already applied.');
  }

  // Migration 013: Deduplicate Bill Attachments & Prevent Duplicate Attachment Records
  if (!appliedMigrations.includes('013_deduplicate_bill_attachments')) {
    console.log('Applying migration: 013_deduplicate_bill_attachments...');
    (() => {
      const now = new Date().toISOString();

      // 1. Delete redundant duplicate attachment records for the same bill and storage_key
      db.prepare(`
        DELETE FROM bill_attachments
        WHERE id NOT IN (
          SELECT MIN(id) FROM bill_attachments GROUP BY bill_id, storage_key
        )
      `).run();

      // 2. Create unique index to guarantee no duplicate attachments per bill in the future
      db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_attachments_unique_file 
        ON bill_attachments(bill_id, storage_key)
      `).run();

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '013_deduplicate_bill_attachments',
        now
      );
    })();
    console.log('Migration 013_deduplicate_bill_attachments applied successfully.');
  } else {
    console.log('Migration 013_deduplicate_bill_attachments already applied.');
  }

  // Migration 014: Synchronize vendor_bills payment statuses and paid amounts with expenses
  if (!appliedMigrations.includes('014_sync_bill_payment_statuses')) {
    console.log('Applying migration: 014_sync_bill_payment_statuses...');
    (() => {
      const now = new Date().toISOString();

      // 1. Sync payment_status and paid_amount from expenses to vendor_bills for all linked records
      db.prepare(`
        UPDATE vendor_bills
        SET 
          payment_status = (SELECT e.payment_status FROM expenses e WHERE e.id = vendor_bills.expense_id),
          paid_amount = (
            CASE 
              WHEN (SELECT e.payment_status FROM expenses e WHERE e.id = vendor_bills.expense_id) = 'paid' 
                THEN vendor_bills.total_amount
              ELSE (
                SELECT COALESCE(SUM(p.amount), 0) 
                FROM expense_payments p 
                WHERE p.expense_id = vendor_bills.expense_id
              )
            END
          ),
          updated_at = ?
        WHERE expense_id IS NOT NULL 
          AND EXISTS (SELECT 1 FROM expenses e WHERE e.id = vendor_bills.expense_id)
      `).run(now);

      // 2. Also match unlinked bills that have matching vendor_id and invoice_number
      db.prepare(`
        UPDATE vendor_bills
        SET 
          expense_id = (
            SELECT e.id FROM expenses e 
            WHERE e.vendor_id = vendor_bills.vendor_id 
              AND UPPER(TRIM(COALESCE(e.invoice_number, ''))) = UPPER(TRIM(COALESCE(vendor_bills.bill_number, '')))
              AND e.approval_status != 'voided'
            LIMIT 1
          ),
          payment_status = (
            SELECT e.payment_status FROM expenses e 
            WHERE e.vendor_id = vendor_bills.vendor_id 
              AND UPPER(TRIM(COALESCE(e.invoice_number, ''))) = UPPER(TRIM(COALESCE(vendor_bills.bill_number, '')))
              AND e.approval_status != 'voided'
            LIMIT 1
          ),
          paid_amount = (
            CASE 
              WHEN (
                SELECT e.payment_status FROM expenses e 
                WHERE e.vendor_id = vendor_bills.vendor_id 
                  AND UPPER(TRIM(COALESCE(e.invoice_number, ''))) = UPPER(TRIM(COALESCE(vendor_bills.bill_number, '')))
                  AND e.approval_status != 'voided'
                LIMIT 1
              ) = 'paid' THEN vendor_bills.total_amount
              ELSE (
                SELECT COALESCE(SUM(p.amount), 0) 
                FROM expense_payments p 
                JOIN expenses e ON e.id = p.expense_id
                WHERE e.vendor_id = vendor_bills.vendor_id 
                  AND UPPER(TRIM(COALESCE(e.invoice_number, ''))) = UPPER(TRIM(COALESCE(vendor_bills.bill_number, '')))
                  AND e.approval_status != 'voided'
              )
            END
          ),
          updated_at = ?
        WHERE expense_id IS NULL
          AND EXISTS (
            SELECT 1 FROM expenses e 
            WHERE e.vendor_id = vendor_bills.vendor_id 
              AND UPPER(TRIM(COALESCE(e.invoice_number, ''))) = UPPER(TRIM(COALESCE(vendor_bills.bill_number, '')))
              AND e.approval_status != 'voided'
          )
      `).run(now);

      db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
        '014_sync_bill_payment_statuses',
        now
      );
    })();
    console.log('Migration 014_sync_bill_payment_statuses applied successfully.');
  } else {
    console.log('Migration 014_sync_bill_payment_statuses already applied.');
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

export const INITIAL_SCHEMA_SQL = `
-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  default_language TEXT NOT NULL DEFAULT 'gu',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Users authentication table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'gu',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Business members (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS business_members (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('owner', 'manager', 'accountant', 'staff')),
  permissions TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(business_id, user_id)
);

-- Business settings & approval policies
CREATE TABLE IF NOT EXISTS business_settings (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  approval_threshold REAL NOT NULL DEFAULT 5000.00,
  require_approval_above_threshold INTEGER NOT NULL DEFAULT 1,
  auto_approve_staff_expenses INTEGER NOT NULL DEFAULT 0,
  default_language TEXT NOT NULL DEFAULT 'gu',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  gemini_api_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_gu TEXT NOT NULL,
  classification TEXT NOT NULL CHECK(classification IN (
    'operating_expense',
    'purchase_inventory',
    'people_wages',
    'asset_purchase',
    'owner_drawing',
    'transfer',
    'other'
  )),
  icon TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(business_id, code)
);

-- Vendors directory
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  tax_identifier TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Expenses core table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  transaction_number TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  vendor_id TEXT REFERENCES vendors(id),
  worker_id TEXT REFERENCES workers(id),
  transaction_type TEXT NOT NULL DEFAULT 'operating_expense',
  description TEXT,
  transaction_date TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  currency_code TEXT NOT NULL DEFAULT 'INR',
  payment_status TEXT NOT NULL CHECK(payment_status IN ('unpaid', 'partially_paid', 'paid')),
  approval_status TEXT NOT NULL CHECK(approval_status IN ('pending_approval', 'approved', 'rejected', 'voided')),
  payment_method TEXT CHECK(payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'credit', 'other')),
  invoice_number TEXT,
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  rejected_by TEXT REFERENCES users(id),
  rejected_at TEXT,
  rejection_reason TEXT,
  voided_by TEXT REFERENCES users(id),
  voided_at TEXT,
  void_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(business_id, transaction_number)
);

-- Expense payments (supports multiple/partial installments)
CREATE TABLE IF NOT EXISTS expense_payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'credit', 'other')),
  reference_number TEXT,
  notes TEXT,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Expense attachments (receipts/invoices)
CREATE TABLE IF NOT EXISTS expense_attachments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- Append-only audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_values TEXT,
  new_values TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);

-- System backups registry
CREATE TABLE IF NOT EXISTS system_backups (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL,
  file_name TEXT,
  storage_location TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  file_size_bytes INTEGER,
  created_by TEXT REFERENCES users(id),
  error_message TEXT,
  created_at TEXT NOT NULL
);

-- External references (e.g. future EZO billing integration sync)
CREATE TABLE IF NOT EXISTS external_references (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  external_system TEXT NOT NULL,
  external_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TEXT,
  error_details TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(business_id, external_system, entity_type, entity_id)
);

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  executed_at TEXT NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_biz_date ON expenses(business_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_approval ON expenses(business_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_payment ON expenses(business_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_expense ON expense_payments(expense_id);
CREATE INDEX IF NOT EXISTS idx_attachments_expense ON expense_attachments(expense_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_biz_time ON audit_logs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Phase 2 (Part B): Manufacturing, Recipe Vault & Raw Materials Stock
CREATE TABLE IF NOT EXISTS raw_materials (
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

CREATE INDEX IF NOT EXISTS idx_raw_mat_biz ON raw_materials(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recipes_biz ON recipes(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recipe_ing_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_prod_batches_biz_date ON production_batches(business_id, production_date DESC);
CREATE INDEX IF NOT EXISTS idx_batch_consump_batch ON batch_consumptions(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_biz_mat ON stock_transactions(business_id, raw_material_id, created_at DESC);

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
`;


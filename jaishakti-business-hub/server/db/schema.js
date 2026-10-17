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
`;

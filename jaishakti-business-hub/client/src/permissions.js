/**
 * Centralized Permission Definitions and Role Defaults
 * Frontend Client - Jai Shakti Business Hub
 */

export const PERMISSION_GROUPS = [
  { id: 'expenses', en: 'Daily Expenses & Ledger', gu: 'દૈનિક ખર્ચ અને ખાતાવહી' },
  { id: 'vendors', en: 'Vendors & Bills', gu: 'વેપારીઓ અને બિલ સ્કેનિંગ' },
  { id: 'workers', en: 'Worker Khata & Staff', gu: 'કારીગર ખાતાવહી અને સ્ટાફ' },
  { id: 'manufacturing', en: 'Manufacturing & Stock', gu: 'ઉત્પાદન, રેસિપી અને સ્ટોક' },
  { id: 'reports', en: 'Reports & Analytics', gu: 'રિપોર્ટ્સ અને આંકડા' },
  { id: 'admin', en: 'Administration & System', gu: 'દુકાન એડમિનિસ્ટ્રેશન' }
];

export const PERMISSIONS_LIST = [
  // Expenses & Ledger
  {
    key: 'can_add_expense',
    group: 'expenses',
    en: 'Add Daily Expenses',
    gu: 'રોજિંદા ખર્ચ ઉમેરવા (Quick & Voice Entry)',
    description: 'Enter new daily expenses and voice notes'
  },
  {
    key: 'can_edit_expense',
    group: 'expenses',
    en: 'Edit Expenses',
    gu: 'દાખલ કરેલ ખર્ચમાં સુધારો કરવો',
    description: 'Modify amount, description, or category of existing expenses'
  },
  {
    key: 'can_approve_expense',
    group: 'expenses',
    en: 'Approve / Reject Expenses',
    gu: 'ખર્ચ મંજૂર / નામંજૂર કરવો (Approvals)',
    description: 'Approve pending expenses above threshold'
  },
  {
    key: 'can_void_expense',
    group: 'expenses',
    en: 'Void & Delete Expenses',
    gu: 'ખર્ચ રદ કરવો અથવા કાયમી ડિલીટ કરવો',
    description: 'Void approved transactions or remove erroneous records'
  },

  // Vendors & Bills
  {
    key: 'can_manage_vendors',
    group: 'vendors',
    en: 'Manage Vendors & Scan Bills',
    gu: 'વેપારી ખાતાવહી અને બિલ OCR સ્કેનિંગ',
    description: 'Create vendors, view purchase histories, and upload bills'
  },

  // Worker Khata & Staff
  {
    key: 'can_manage_workers',
    group: 'workers',
    en: 'Manage Workers & Diary Scan',
    gu: 'કારીગર ખાતા અને જૂનો ચોપડો સ્કેન કરવો',
    description: 'Add workers, edit wages, and scan handwritten diary pages'
  },
  {
    key: 'can_record_attendance',
    group: 'workers',
    en: 'Mark Daily Attendance',
    gu: 'રોજિંદી હાજરી પૂરવી (Attendance)',
    description: 'Mark present, half-day, and leaves for workers'
  },
  {
    key: 'can_give_upad',
    group: 'workers',
    en: 'Give Upad / Advance & Repayments',
    gu: 'કારીગર ઉપાડ આપવો અને જમા કરવો (Upad)',
    description: 'Record cash advances and deductions in worker passbook'
  },
  {
    key: 'can_settle_salary',
    group: 'workers',
    en: 'Settle Monthly Salary',
    gu: 'માસિક પગાર હિસાબ & ચૂકવણી (Settlement)',
    description: 'Finalize monthly salary calculations and pay out net balances'
  },

  // Manufacturing, Recipes & Stock
  {
    key: 'can_view_recipes',
    group: 'manufacturing',
    en: 'Access Recipe Vault',
    gu: 'રેસિપી તિજોરી જોવી (PIN Protected)',
    description: 'Unlock and view secret recipe blueprints with PIN'
  },
  {
    key: 'can_manage_recipes',
    group: 'manufacturing',
    en: 'Manage Recipe Vault',
    gu: 'રેસિપી બનાવવી અને ફેરફાર કરવો',
    description: 'Add, edit, or upload handwritten recipe cards'
  },
  {
    key: 'can_manage_stock',
    group: 'manufacturing',
    en: 'Raw Materials & Stock',
    gu: 'કાચો માલ અને સ્ટોક વ્યવસ્થાપન',
    description: 'Track, adjust, and view real-time raw material inventory'
  },
  {
    key: 'can_record_production',
    group: 'manufacturing',
    en: 'Batch Production & Weighing',
    gu: 'ઉત્પાદન બેચ અને વજન માપ',
    description: 'Mobile daily batch entry and interactive weighing sheet for kitchen chef'
  },

  // Reports & Analytics
  {
    key: 'can_view_reports',
    group: 'reports',
    en: 'View Reports & Analytics',
    gu: 'નાણાકીય રિપોર્ટ્સ અને નફો-નુકસાન વિગત',
    description: 'Access visual analytics, cash ledger, and expense charts'
  },
  {
    key: 'can_export_data',
    group: 'reports',
    en: 'Export Data (CSV / Excel)',
    gu: 'ડેટા CSV એક્સપોર્ટ કરવો',
    description: 'Download transaction and vendor ledger exports'
  },

  // Administration & System
  {
    key: 'can_manage_categories',
    group: 'admin',
    en: 'Manage Categories & Settings',
    gu: 'ખર્ચ કેટેગરી અને દુકાન સેટિંગ્સ',
    description: 'Add or modify expense categories and approval thresholds'
  },
  {
    key: 'can_manage_team',
    group: 'admin',
    en: 'Manage Team & Permissions',
    gu: 'ટીમ સભ્યો અને પરવાનગી મેનેજમેન્ટ (Owner)',
    description: 'Add, edit, or delete team members and configure personal permissions'
  },
  {
    key: 'can_manage_system',
    group: 'admin',
    en: 'Backup & System Health',
    gu: 'બેકઅપ લેવું અને સિસ્ટમ હેલ્થ',
    description: 'Create ZIP backups, restore database, and inspect system logs'
  }
];

export const DEFAULT_ROLE_PERMISSIONS = {
  owner: {
    can_add_expense: true,
    can_edit_expense: true,
    can_approve_expense: true,
    can_void_expense: true,
    can_manage_vendors: true,
    can_manage_workers: true,
    can_record_attendance: true,
    can_give_upad: true,
    can_settle_salary: true,
    can_view_recipes: true,
    can_manage_recipes: true,
    can_manage_stock: true,
    can_record_production: true,
    can_view_reports: true,
    can_export_data: true,
    can_manage_categories: true,
    can_manage_team: true,
    can_manage_system: true
  },
  manager: {
    can_add_expense: true,
    can_edit_expense: true,
    can_approve_expense: true,
    can_void_expense: true,
    can_manage_vendors: true,
    can_manage_workers: true,
    can_record_attendance: true,
    can_give_upad: true,
    can_settle_salary: true,
    can_view_recipes: true,
    can_manage_recipes: true,
    can_manage_stock: true,
    can_record_production: true,
    can_view_reports: true,
    can_export_data: true,
    can_manage_categories: true,
    can_manage_team: false,
    can_manage_system: false
  },
  accountant: {
    can_add_expense: true,
    can_edit_expense: false,
    can_approve_expense: false,
    can_void_expense: false,
    can_manage_vendors: true,
    can_manage_workers: true,
    can_record_attendance: false,
    can_give_upad: false,
    can_settle_salary: true,
    can_view_recipes: false,
    can_manage_recipes: false,
    can_manage_stock: true,
    can_record_production: false,
    can_view_reports: true,
    can_export_data: true,
    can_manage_categories: false,
    can_manage_team: false,
    can_manage_system: false
  },
  staff: {
    can_add_expense: true,
    can_edit_expense: false,
    can_approve_expense: false,
    can_void_expense: false,
    can_manage_vendors: false,
    can_manage_workers: false,
    can_record_attendance: true,
    can_give_upad: false,
    can_settle_salary: false,
    can_view_recipes: false,
    can_manage_recipes: false,
    can_manage_stock: false,
    can_record_production: true,
    can_view_reports: false,
    can_export_data: false,
    can_manage_categories: false,
    can_manage_team: false,
    can_manage_system: false
  }
};

export function resolveUserPermissions(role, customPermissions = null) {
  // Business owners unconditionally have full privileges across all operations
  if (role === 'owner') {
    return { ...DEFAULT_ROLE_PERMISSIONS.owner };
  }

  const base = { ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.staff) };
  if (!customPermissions) return base;

  let parsed = customPermissions;
  if (typeof customPermissions === 'string') {
    try {
      parsed = JSON.parse(customPermissions);
    } catch (_) {
      parsed = {};
    }
  }

  return { ...base, ...parsed };
}

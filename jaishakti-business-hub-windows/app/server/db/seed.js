import bcrypt from 'bcryptjs';
import { getDatabase } from './index.js';
import { runMigrations } from './migrate.js';

export function seedDatabase(dbInstance = null) {
  const db = dbInstance || getDatabase();
  runMigrations(db);

  const now = new Date().toISOString();
  const BIZ_ID = 'biz_jaishakti_001';

  db.transaction(() => {
    // 1. Seed Business
    const existingBiz = db.prepare('SELECT id FROM businesses WHERE id = ?').get(BIZ_ID);
    if (!existingBiz) {
      db.prepare(`
        INSERT INTO businesses (id, name, currency_code, timezone, default_language, created_at, updated_at)
        VALUES (?, ?, 'INR', 'Asia/Kolkata', 'gu', ?, ?)
      `).run(BIZ_ID, 'Jai Shakti Farsan Mart', now, now);
      console.log('Seeded business: Jai Shakti Farsan Mart');
    }

    // 2. Seed Business Settings
    const existingSettings = db.prepare('SELECT id FROM business_settings WHERE business_id = ?').get(BIZ_ID);
    if (!existingSettings) {
      db.prepare(`
        INSERT INTO business_settings (
          id, business_id, approval_threshold, require_approval_above_threshold,
          auto_approve_staff_expenses, default_language, timezone, created_at, updated_at
        ) VALUES (?, ?, 5000.00, 1, 0, 'gu', 'Asia/Kolkata', ?, ?)
      `).run('set_' + BIZ_ID, BIZ_ID, now, now);
      console.log('Seeded business settings (Threshold: ₹5,000)');
    }

    // 3. Seed Users & Members
    const defaultUsers = [
      {
        id: 'usr_owner_001',
        username: 'admin',
        password: 'adminpassword123',
        full_name: 'Owner (માલિક)',
        role: 'owner',
        lang: 'gu'
      },
      {
        id: 'usr_manager_001',
        username: 'manager',
        password: 'managerpassword123',
        full_name: 'Kishorbhai (મેનેજર)',
        role: 'manager',
        lang: 'gu'
      },
      {
        id: 'usr_staff_001',
        username: 'staff',
        password: 'staffpassword123',
        full_name: 'Rameshbhai (સ્ટાફ)',
        role: 'staff',
        lang: 'gu'
      },
      {
        id: 'usr_acct_001',
        username: 'accountant',
        password: 'accountantpassword123',
        full_name: 'Hasmukhbhai (એકાઉન્ટન્ટ)',
        role: 'accountant',
        lang: 'en'
      }
    ];

    for (const u of defaultUsers) {
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
      let userId = u.id;
      if (!existingUser) {
        const hash = bcrypt.hashSync(u.password, 10);
        db.prepare(`
          INSERT INTO users (id, username, password_hash, full_name, preferred_language, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `).run(u.id, u.username, hash, u.full_name, u.lang, now, now);
        console.log(`Seeded user: ${u.username} (${u.role})`);
      } else {
        userId = existingUser.id;
      }

      const existingMember = db.prepare('SELECT id FROM business_members WHERE business_id = ? AND user_id = ?').get(BIZ_ID, userId);
      if (!existingMember) {
        db.prepare(`
          INSERT INTO business_members (id, business_id, user_id, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?)
        `).run(`bm_${userId}`, BIZ_ID, userId, u.role, now, now);
      }
    }

    // 4. Seed Categories - Specifically configured for Jai Shakti Farsan Mart
    const activeCategories = [
      { code: 'tea_refreshment', en: 'Tea & refreshments', gu: 'ચા અને નાસ્તો', class: 'operating_expense', icon: 'Coffee', sort: 10 },
      { code: 'transport_delivery', en: 'Transport & delivery', gu: 'ટ્રાન્સપોર્ટ અને ડિલિવરી', class: 'operating_expense', icon: 'Truck', sort: 20 },
      { code: 'vegetable_purchase', en: 'Vegetable purchase', gu: 'શાકભાજી ખરીદી', class: 'purchase_inventory', icon: 'Carrot', sort: 30 },
      { code: 'raw_materials', en: 'Raw materials', gu: 'કાચો માલ (બેસન, તેલ, મસાલા)', class: 'purchase_inventory', icon: 'Package', sort: 40 },
      { code: 'packaging_materials', en: 'Packaging materials', gu: 'પેકિંગ મટીરીયલ (બોક્સ, પાઉચ)', class: 'purchase_inventory', icon: 'Boxes', sort: 50 },
      { code: 'finished_goods', en: 'Finished goods purchases', gu: 'તૈયાર માલ ખરીદી', class: 'purchase_inventory', icon: 'Store', sort: 60 },
      { code: 'worker_advance_upad', en: 'Worker advance (Upad)', gu: 'કારીગર ઉપાડ / એડવાન્સ', class: 'people_wages', icon: 'HandCoins', sort: 70 },
      { code: 'cleaning_supplies', en: 'Cleaning & supplies', gu: 'સફાઈ અને સામાન', class: 'operating_expense', icon: 'Sparkles', sort: 80 },
      { code: 'repairs_maintenance', en: 'Repair & maintenance', gu: 'સમારકામ અને જાળવણી', class: 'operating_expense', icon: 'Wrench', sort: 90 },
      { code: 'electricity_utilities', en: 'Electricity & utility bills', gu: 'વીજળી અને બિલ', class: 'operating_expense', icon: 'Zap', sort: 100 }
    ];

    // Delete any categories not in the 10 approved active categories
    const activeCodes = activeCategories.map(c => `'${c.code}'`).join(',');
    db.prepare(`DELETE FROM expense_categories WHERE business_id = ? AND code NOT IN (${activeCodes})`).run(BIZ_ID);

    for (const cat of activeCategories) {
      const existing = db.prepare('SELECT id FROM expense_categories WHERE business_id = ? AND code = ?').get(BIZ_ID, cat.code);
      if (!existing) {
        db.prepare(`
          INSERT INTO expense_categories (
            id, business_id, code, name_en, name_gu, classification, icon, is_active, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        `).run(`cat_${cat.code}`, BIZ_ID, cat.code, cat.en, cat.gu, cat.class, cat.icon, cat.sort, now, now);
      } else {
        db.prepare(`
          UPDATE expense_categories 
          SET name_en = ?, name_gu = ?, icon = ?, is_active = 1, sort_order = ?, updated_at = ?
          WHERE id = ?
        `).run(cat.en, cat.gu, cat.icon, cat.sort, now, existing.id);
      }
    }
    console.log(`Configured ${activeCategories.length} active expense categories for Jai Shakti.`);

    // 5. Vendors are added dynamically via Bill OCR and manual entry
    console.log('Vendors initialized.');
  })();

  return true;
}

// Allow standalone execution
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  try {
    seedDatabase();
    console.log('Database seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

export default seedDatabase;

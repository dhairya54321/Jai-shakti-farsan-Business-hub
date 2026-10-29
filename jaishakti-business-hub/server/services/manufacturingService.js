import crypto from 'crypto';
import { getDatabase } from '../db/index.js';
import { logAudit } from './expenseService.js';

function recordAudit(db, user, entityType, entityId, action, prevValues = null, newValues = null, reason = null) {
  try {
    logAudit(db, {
      businessId: user?.business_id || 'biz_jaishakti_001',
      actorUserId: user?.id || 'usr_owner_001',
      entityType,
      entityId,
      action,
      prevValues: prevValues ? JSON.stringify(prevValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      reason
    });
  } catch (err) {
    console.warn('Audit log notice:', err.message);
  }
}

export const RAW_MATERIAL_CATEGORIES = [
  { id: 'flour', en: 'Flours & Grains (Besan, Maida, Dal)', gu: 'લોટ અને અનાજ (બેસન, મેંદો, ચણા દાળ)' },
  { id: 'oil', en: 'Cooking Oils & Ghee (Singtel, Kapasya, Ghee)', gu: 'ખાદ્ય તેલ અને ઘી (કપાસિયા તેલ, શુદ્ધ ઘી)' },
  { id: 'spice', en: 'Spices & Seasonings', gu: 'મસાલા અને સીઝનીંગ (તલ, મરી, હિંગ, કોપરા છીણ)' },
  { id: 'vegetable', en: 'Vegetables (Potatoes, Chillies)', gu: 'શાકભાજી (બટાકા, લીલા મરચાં)' },
  { id: 'fuel', en: 'Fuel (Commercial LPG Gas)', gu: 'બળતણ (૧૯ કિલો ગેસ સિલિન્ડર)' },
  { id: 'packaging', en: 'Packaging (Pouches, Bags, Boxes)', gu: 'પેકિંગ સાધન (પાઉચ, પીપી બેગ, બોક્સ)' },
  { id: 'trading', en: 'Trading / Resale Goods (Thepla, Khakhra, Papad)', gu: 'તૈયાર માલ / વેચાણ (થેપલા, ખાખરા, પાપડ)' },
  { id: 'other', en: 'Other Raw Materials', gu: 'અન્ય કાચો માલ' }
];

export const UNIT_DEFINITIONS = {
  bag_50kg: { id: 'bag_50kg', en: '50 Kg Bag (Katta/Bori)', gu: '૫૦ કિલો કટ્ટા / બોરી', baseUnit: 'kg', ratio: 50 },
  katta: { id: 'katta', en: '50 Kg Bag (Katta)', gu: '૫૦ કિલો કટ્ટા', baseUnit: 'kg', ratio: 50 },
  bag_30kg: { id: 'bag_30kg', en: '30 Kg Bag (Katta/Bori)', gu: '૩૦ કિલો કટ્ટા / બોરી', baseUnit: 'kg', ratio: 30 },
  bag_25kg: { id: 'bag_25kg', en: '25 Kg Bag (Katta/Bori)', gu: '૨૫ કિલો કટ્ટા / બોરી', baseUnit: 'kg', ratio: 25 },
  tin_15kg: { id: 'tin_15kg', en: '15 Kg Tin (Dabba)', gu: '૧૫ કિલો ડબ્બો', baseUnit: 'kg', ratio: 15 },
  dabba: { id: 'dabba', en: '15 Kg Tin (Dabba)', gu: '૧૫ કિલો ડબ્બો', baseUnit: 'kg', ratio: 15 },
  cylinder_19kg: { id: 'cylinder_19kg', en: '19 Kg LPG Cylinder', gu: '૧૯ કિલો ગેસ બાટલો', baseUnit: 'cylinder', ratio: 1 },
  kg: { id: 'kg', en: 'Kilogram (Kg)', gu: 'કિલોગ્રામ (કિલો)', baseUnit: 'kg', ratio: 1 },
  g: { id: 'g', en: 'Gram (g)', gu: 'ગ્રામ (ગ્રા)', baseUnit: 'kg', ratio: 0.001 },
  piece: { id: 'piece', en: 'Piece (Pcs)', gu: 'નંગ (પીસ / બોટલ)', baseUnit: 'piece', ratio: 1 },
  pkt: { id: 'pkt', en: 'Packet (Pkt)', gu: 'પેકેટ (Pkt / પાઉચ)', baseUnit: 'piece', ratio: 1 },
  box: { id: 'box', en: 'Box', gu: 'બોક્સ', baseUnit: 'box', ratio: 1 },
  qtl: { id: 'qtl', en: 'Quintal (100 Kg)', gu: 'ક્વિન્ટલ (૧૦૦ કિલો)', baseUnit: 'kg', ratio: 100 }
};

export const RECIPE_CATEGORIES = [
  { id: 'daily_farsan', en: 'Daily Farsan (રોજિંદુ ફરસાણ)', gu: 'રોજિંદુ ફરસાણ' },
  { id: 'festive_sweet', en: 'Festive Sweets (તહેવાર મીઠાઈ)', gu: 'તહેવાર મીઠાઈ' },
  { id: 'dry_snack', en: 'Dry Snacks (સૂકો નાસ્તો)', gu: 'સૂકો નાસ્તો' },
  { id: 'namkeen', en: 'Namkeen / Sev (નમકીન / સેવ)', gu: 'નમકીન / સેવ' },
  { id: 'other', en: 'Other Special Items', gu: 'અન્ય સ્પેશિયલ' }
];

export function formatStockDisplay(stock, primaryUnit, baseUnit = 'kg') {
  const num = Number(stock) || 0;
  if (primaryUnit === 'bag_50kg' || primaryUnit === 'katta') {
    const bags = (num / 50).toFixed(1);
    return `${bags} Bags (${num.toFixed(1)} Kg)`;
  }
  if (primaryUnit === 'bag_30kg') {
    const bags = (num / 30).toFixed(1);
    return `${bags} Bags (${num.toFixed(1)} Kg)`;
  }
  if (primaryUnit === 'bag_25kg') {
    const bags = (num / 25).toFixed(1);
    return `${bags} Bags (${num.toFixed(1)} Kg)`;
  }
  if (primaryUnit === 'tin_15kg' || primaryUnit === 'dabba') {
    const tins = (num / 15).toFixed(1);
    return `${tins} Tins (${num.toFixed(1)} Kg)`;
  }
  if (primaryUnit === 'cylinder_19kg') {
    return `${Math.round(num)} Cylinders`;
  }
  if (primaryUnit === 'piece') {
    return `${Math.round(num)} Pcs`;
  }
  if (primaryUnit === 'pkt') {
    return `${Math.round(num)} Pkts`;
  }
  if (primaryUnit === 'box') {
    return `${Math.round(num)} Boxes`;
  }
  return `${num.toFixed(2)} Kg`;
}

export const ManufacturingService = {
  // ==========================================
  // 1. RAW MATERIALS & STOCK INVENTORY
  // ==========================================

  getRawMaterials(businessId, options = {}) {
    const db = getDatabase();
    let query = `
      SELECT rm.*, v.name as supplier_name
      FROM raw_materials rm
      LEFT JOIN vendors v ON v.id = rm.supplier_vendor_id
      WHERE rm.business_id = ? AND rm.is_active = 1
    `;
    const params = [businessId];

    if (options.category) {
      query += ` AND rm.category = ?`;
      params.push(options.category);
    }

    if (options.search) {
      const term = `%${options.search.trim()}%`;
      query += ` AND (rm.name_en LIKE ? OR rm.name_gu LIKE ? OR rm.category LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY rm.category ASC, rm.name_en ASC`;

    let rows = db.prepare(query).all(...params);

    // Compute status flags and formatted strings
    rows = rows.map(r => {
      const isLow = r.current_stock <= r.min_stock_alert;
      return {
        ...r,
        is_low_stock: isLow,
        formatted_stock: formatStockDisplay(r.current_stock, r.primary_unit, r.base_unit)
      };
    });

    if (options.lowStockOnly) {
      rows = rows.filter(r => r.is_low_stock);
    }

    return rows;
  },

  getRawMaterialById(businessId, id) {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT rm.*, v.name as supplier_name
      FROM raw_materials rm
      LEFT JOIN vendors v ON v.id = rm.supplier_vendor_id
      WHERE rm.business_id = ? AND rm.id = ?
    `).get(businessId, id);

    if (!row) return null;

    return {
      ...row,
      is_low_stock: row.current_stock <= row.min_stock_alert,
      formatted_stock: formatStockDisplay(row.current_stock, row.primary_unit, row.base_unit)
    };
  },

  createRawMaterial(user, data) {
    const db = getDatabase();
    const errors = [];

    if (!data.name_en || !data.name_en.trim()) {
      errors.push('Raw material name (English) is required.');
    }
    if (!data.name_gu || !data.name_gu.trim()) {
      errors.push('Raw material name (Gujarati) is required.');
    }
    if (!data.category) {
      errors.push('Category is required.');
    }
    if (!data.primary_unit) {
      errors.push('Primary unit of measurement is required.');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }

    const unitInfo = UNIT_DEFINITIONS[data.primary_unit] || { baseUnit: 'kg', ratio: 1 };
    const baseUnit = data.base_unit || unitInfo.baseUnit;
    const unitRatio = Number(data.unit_ratio) || unitInfo.ratio;

    const initialStock = Math.max(0, Number(data.initial_stock) || 0);
    const minAlert = Math.max(0, Number(data.min_stock_alert) || 0);
    const costPerUnit = Math.max(0, Number(data.cost_per_unit) || 0);

    const id = 'rm_' + crypto.randomUUID();
    const now = new Date().toISOString();

    return db.transaction(() => {
      db.prepare(`
        INSERT INTO raw_materials (
          id, business_id, name_en, name_gu, category, primary_unit,
          base_unit, unit_ratio, current_stock, min_stock_alert,
          cost_per_unit, supplier_vendor_id, notes, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id,
        user.business_id,
        data.name_en.trim(),
        data.name_gu.trim(),
        data.category,
        data.primary_unit,
        baseUnit,
        unitRatio,
        initialStock,
        minAlert,
        costPerUnit,
        data.supplier_vendor_id || null,
        data.notes || null,
        now,
        now
      );

      // Record opening stock transaction if stock > 0
      if (initialStock > 0) {
        db.prepare(`
          INSERT INTO stock_transactions (
            id, business_id, raw_material_id, transaction_type,
            quantity, unit, base_quantity, stock_before, stock_after,
            reference_type, notes, recorded_by, created_at
          ) VALUES (?, ?, ?, 'inward_manual', ?, ?, ?, 0, ?, 'manual_adjustment', 'Opening Stock', ?, ?)
        `).run(
          'stx_' + crypto.randomUUID(),
          user.business_id,
          id,
          initialStock,
          baseUnit,
          initialStock,
          initialStock,
          user.id,
          now
        );
      }

      recordAudit(db, user, 'raw_materials', id, 'create', null, { name: data.name_en, stock: initialStock });
      return this.getRawMaterialById(user.business_id, id);
    })();
  },

  updateRawMaterial(user, id, data) {
    const db = getDatabase();
    const existing = this.getRawMaterialById(user.business_id, id);
    if (!existing) {
      throw new Error('Raw material not found.');
    }

    const now = new Date().toISOString();
    const unitInfo = UNIT_DEFINITIONS[data.primary_unit || existing.primary_unit] || { baseUnit: 'kg', ratio: 1 };
    const baseUnit = data.base_unit || unitInfo.baseUnit;
    const unitRatio = Number(data.unit_ratio) || unitInfo.ratio;

    db.prepare(`
      UPDATE raw_materials SET
        name_en = COALESCE(?, name_en),
        name_gu = COALESCE(?, name_gu),
        category = COALESCE(?, category),
        primary_unit = COALESCE(?, primary_unit),
        base_unit = ?,
        unit_ratio = ?,
        min_stock_alert = COALESCE(?, min_stock_alert),
        cost_per_unit = COALESCE(?, cost_per_unit),
        supplier_vendor_id = ?,
        notes = ?,
        updated_at = ?
      WHERE business_id = ? AND id = ?
    `).run(
      data.name_en ? data.name_en.trim() : null,
      data.name_gu ? data.name_gu.trim() : null,
      data.category || null,
      data.primary_unit || null,
      baseUnit,
      unitRatio,
      data.min_stock_alert !== undefined ? Number(data.min_stock_alert) : null,
      data.cost_per_unit !== undefined ? Number(data.cost_per_unit) : null,
      data.supplier_vendor_id || null,
      data.notes || null,
      now,
      user.business_id,
      id
    );

    recordAudit(db, user, 'raw_materials', id, 'update', existing, data);
    return this.getRawMaterialById(user.business_id, id);
  },

  deleteRawMaterial(user, id) {
    const db = getDatabase();
    const existing = this.getRawMaterialById(user.business_id, id);
    if (!existing) {
      throw new Error('Raw material not found.');
    }

    // Check if ingredient is used in any active recipes
    const usedInRecipes = db.prepare(`
      SELECT COUNT(*) as count FROM recipe_ingredients WHERE raw_material_id = ?
    `).get(id);

    if (usedInRecipes && usedInRecipes.count > 0) {
      // Soft-delete to preserve recipe integrity
      db.prepare(`
        UPDATE raw_materials SET is_active = 0, updated_at = ? WHERE id = ?
      `).run(new Date().toISOString(), id);
    } else {
      db.prepare(`DELETE FROM raw_materials WHERE id = ?`).run(id);
    }

    recordAudit(db, user, 'raw_materials', id, 'delete', existing, null);
    return { success: true };
  },

  adjustStock(user, id, adjustment) {
    const db = getDatabase();
    const material = this.getRawMaterialById(user.business_id, id);
    if (!material) {
      throw new Error('Raw material not found.');
    }

    const { transaction_type, quantity, unit, notes } = adjustment;
    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive number.');
    }

    const validTypes = ['inward_manual', 'adjustment_loss', 'adjustment_gain'];
    if (!validTypes.includes(transaction_type)) {
      throw new Error(`Invalid transaction type. Expected one of: ${validTypes.join(', ')}`);
    }

    const unitInfo = UNIT_DEFINITIONS[unit || material.primary_unit] || { ratio: 1 };
    const baseQty = (unit && unit !== material.base_unit) ? qty * unitInfo.ratio : qty;

    return db.transaction(() => {
      const stockBefore = material.current_stock;
      let stockAfter = stockBefore;

      if (transaction_type === 'inward_manual' || transaction_type === 'adjustment_gain') {
        stockAfter = stockBefore + baseQty;
      } else if (transaction_type === 'adjustment_loss') {
        stockAfter = Math.max(0, stockBefore - baseQty);
      }

      db.prepare(`
        UPDATE raw_materials SET current_stock = ?, updated_at = ? WHERE id = ?
      `).run(stockAfter, new Date().toISOString(), id);

      const stxId = 'stx_' + crypto.randomUUID();
      const signedBaseQty = (transaction_type === 'adjustment_loss') ? -baseQty : baseQty;

      db.prepare(`
        INSERT INTO stock_transactions (
          id, business_id, raw_material_id, transaction_type,
          quantity, unit, base_quantity, stock_before, stock_after,
          reference_type, notes, recorded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_adjustment', ?, ?, ?)
      `).run(
        stxId,
        user.business_id,
        id,
        transaction_type,
        qty,
        unit || material.base_unit,
        signedBaseQty,
        stockBefore,
        stockAfter,
        notes || 'Manual stock adjustment',
        user.id,
        new Date().toISOString()
      );

      recordAudit(db, user, 'raw_materials', id, 'stock_adjust', { stockBefore }, { stockAfter, transaction_type });
      return {
        material: this.getRawMaterialById(user.business_id, id),
        stockBefore,
        stockAfter,
        transactionId: stxId
      };
    })();
  },

  getStockTransactions(businessId, options = {}) {
    const db = getDatabase();
    let query = `
      SELECT st.*, rm.name_en as material_name_en, rm.name_gu as material_name_gu, u.full_name as user_name
      FROM stock_transactions st
      JOIN raw_materials rm ON rm.id = st.raw_material_id
      LEFT JOIN users u ON u.id = st.recorded_by
      WHERE st.business_id = ?
    `;
    const params = [businessId];

    if (options.materialId) {
      query += ` AND st.raw_material_id = ?`;
      params.push(options.materialId);
    }

    if (options.type) {
      query += ` AND st.transaction_type = ?`;
      params.push(options.type);
    }

    query += ` ORDER BY st.created_at DESC, st.rowid DESC LIMIT ?`;
    params.push(options.limit || 50);

    return db.prepare(query).all(...params);
  },

  // Dual Action: Inward Stock from OCR Vendor Delivery Bill
  inwardStockFromBill(user, billId, items = []) {
    if (!items || items.length === 0) return { count: 0 };
    const db = getDatabase();
    const now = new Date().toISOString();

    return db.transaction(() => {
      let updatedCount = 0;
      for (const item of items) {
        if (!item.raw_material_id || !item.quantity) continue;
        const mat = db.prepare('SELECT * FROM raw_materials WHERE id = ? AND business_id = ?').get(item.raw_material_id, user.business_id);
        if (!mat) continue;

        const qty = Number(item.quantity);
        if (qty <= 0) continue;

        const unitDef = UNIT_DEFINITIONS[item.unit || mat.primary_unit] || { ratio: 1 };
        const baseQty = (item.unit && item.unit !== mat.base_unit) ? qty * unitDef.ratio : qty;

        const stockBefore = mat.current_stock;
        const stockAfter = stockBefore + baseQty;

        db.prepare(`
          UPDATE raw_materials SET current_stock = ?, updated_at = ? WHERE id = ?
        `).run(stockAfter, now, mat.id);

        db.prepare(`
          INSERT INTO stock_transactions (
            id, business_id, raw_material_id, transaction_type,
            quantity, unit, base_quantity, stock_before, stock_after,
            reference_id, reference_type, notes, recorded_by, created_at
          ) VALUES (?, ?, ?, 'inward_ocr', ?, ?, ?, ?, ?, ?, 'vendor_bill', ?, ?, ?)
        `).run(
          'stx_' + crypto.randomUUID(),
          user.business_id,
          mat.id,
          qty,
          item.unit || mat.primary_unit,
          baseQty,
          stockBefore,
          stockAfter,
          billId,
          item.notes || 'Inward from OCR Delivery Bill',
          user.id,
          now
        );

        updatedCount++;
      }
      return { count: updatedCount };
    })();
  },

  // ==========================================
  // 2. RECIPE VAULT & PIN SECURITY
  // ==========================================

  verifyRecipeVaultPin(businessId, enteredPin) {
    const db = getDatabase();
    let correctPin = '1984';
    try {
      const settings = db.prepare('SELECT recipe_vault_pin FROM business_settings WHERE business_id = ?').get(businessId);
      if (settings && settings.recipe_vault_pin) {
        correctPin = String(settings.recipe_vault_pin).trim();
      }
    } catch (e) {
      console.warn('Fallback to default PIN due to query warning:', e.message);
    }

    const cleanEntered = String(enteredPin || '').trim();
    if (cleanEntered === correctPin) {
      return { success: true, valid: true };
    }
    return { success: false, valid: false, error: 'Invalid secret PIN. Access denied.' };
  },

  changeRecipeVaultPin(user, currentPin, newPin) {
    const db = getDatabase();
    const verification = this.verifyRecipeVaultPin(user.business_id, currentPin);
    if (!verification.valid) {
      throw new Error('Current PIN is incorrect.');
    }

    const cleanNewPin = String(newPin).trim();
    if (!/^\d{4}$/.test(cleanNewPin)) {
      throw new Error('New PIN must be exactly 4 numeric digits (e.g. 1984).');
    }

    db.prepare(`
      UPDATE business_settings SET recipe_vault_pin = ?, updated_at = ? WHERE business_id = ?
    `).run(cleanNewPin, new Date().toISOString(), user.business_id);

    recordAudit(db, user, 'business_settings', user.business_id, 'change_recipe_pin', null, { changed: true });
    return { success: true, message: 'Recipe Vault PIN updated successfully.' };
  },

  getRecipes(businessId, options = {}) {
    const db = getDatabase();
    let query = `
      SELECT r.*,
        (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) as ingredient_count
      FROM recipes r
      WHERE r.business_id = ? AND r.is_active = 1
    `;
    const params = [businessId];

    if (options.category) {
      query += ` AND r.category = ?`;
      params.push(options.category);
    }

    if (options.frequentOnly) {
      query += ` AND r.is_frequent = 1`;
    }

    if (options.search) {
      const term = `%${options.search.trim()}%`;
      query += ` AND (r.name_en LIKE ? OR r.name_gu LIKE ? OR r.chef_notes LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY r.is_frequent DESC, r.name_en ASC`;

    return db.prepare(query).all(...params);
  },

  getRecipeById(businessId, id) {
    const db = getDatabase();
    const recipe = db.prepare(`
      SELECT * FROM recipes WHERE business_id = ? AND id = ?
    `).get(businessId, id);

    if (!recipe) return null;

    const ingredients = db.prepare(`
      SELECT ri.*, rm.name_en as material_name_en, rm.name_gu as material_name_gu,
             rm.category as material_category, rm.current_stock, rm.primary_unit, rm.base_unit
      FROM recipe_ingredients ri
      JOIN raw_materials rm ON rm.id = ri.raw_material_id
      WHERE ri.recipe_id = ?
      ORDER BY ri.sort_order ASC, rm.name_en ASC
    `).all(id);

    return {
      ...recipe,
      ingredients: ingredients.map(ing => ({
        ...ing,
        formatted_stock: formatStockDisplay(ing.current_stock, ing.primary_unit, ing.base_unit)
      }))
    };
  },

  createRecipe(user, data, file = null) {
    const db = getDatabase();
    const errors = [];

    if (!data.name_en || !data.name_en.trim()) {
      errors.push('Recipe name (English) is required.');
    }
    if (!data.name_gu || !data.name_gu.trim()) {
      errors.push('Recipe name (Gujarati) is required.');
    }

    const baseBatch = Number(data.base_batch_size) || 10;
    if (baseBatch <= 0) {
      errors.push('Base batch size must be greater than zero.');
    }

    let parsedIngredients = [];
    if (typeof data.ingredients === 'string') {
      try {
        parsedIngredients = JSON.parse(data.ingredients);
      } catch (_) {
        errors.push('Invalid ingredients JSON payload.');
      }
    } else if (Array.isArray(data.ingredients)) {
      parsedIngredients = data.ingredients;
    }

    if (parsedIngredients.length === 0) {
      errors.push('At least one ingredient is required in the recipe blueprint.');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }

    const recipeId = 'rcp_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const photoUrl = file ? `/api/manufacturing/photos/${file.filename}` : (data.photo_url || null);

    return db.transaction(() => {
      db.prepare(`
        INSERT INTO recipes (
          id, business_id, name_en, name_gu, category, base_batch_size,
          batch_unit, prep_time_minutes, chef_notes, photo_url,
          is_frequent, is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).run(
        recipeId,
        user.business_id,
        data.name_en.trim(),
        data.name_gu.trim(),
        data.category || 'daily_farsan',
        baseBatch,
        data.batch_unit || 'kg',
        Number(data.prep_time_minutes) || 60,
        data.chef_notes || null,
        photoUrl,
        data.is_frequent === true || data.is_frequent === 'true' || data.is_frequent === 1 ? 1 : 0,
        user.id,
        now,
        now
      );

      const insertIng = db.prepare(`
        INSERT INTO recipe_ingredients (
          id, recipe_id, raw_material_id, quantity, unit, sort_order, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      parsedIngredients.forEach((ing, idx) => {
        insertIng.run(
          'ing_' + crypto.randomUUID(),
          recipeId,
          ing.raw_material_id,
          Number(ing.quantity),
          ing.unit || 'kg',
          idx + 1,
          ing.notes || null,
          now
        );
      });

      recordAudit(db, user, 'recipes', recipeId, 'create', null, { name: data.name_en });
      return this.getRecipeById(user.business_id, recipeId);
    })();
  },

  updateRecipe(user, id, data, file = null) {
    const db = getDatabase();
    const existing = this.getRecipeById(user.business_id, id);
    if (!existing) {
      throw new Error('Recipe not found.');
    }

    const now = new Date().toISOString();
    let photoUrl = existing.photo_url;
    if (file) {
      photoUrl = `/api/manufacturing/photos/${file.filename}`;
    } else if (data.photo_url !== undefined) {
      photoUrl = data.photo_url;
    }

    return db.transaction(() => {
      db.prepare(`
        UPDATE recipes SET
          name_en = COALESCE(?, name_en),
          name_gu = COALESCE(?, name_gu),
          category = COALESCE(?, category),
          base_batch_size = COALESCE(?, base_batch_size),
          batch_unit = COALESCE(?, batch_unit),
          prep_time_minutes = COALESCE(?, prep_time_minutes),
          chef_notes = COALESCE(?, chef_notes),
          photo_url = ?,
          is_frequent = COALESCE(?, is_frequent),
          updated_at = ?
        WHERE business_id = ? AND id = ?
      `).run(
        data.name_en ? data.name_en.trim() : null,
        data.name_gu ? data.name_gu.trim() : null,
        data.category || null,
        data.base_batch_size ? Number(data.base_batch_size) : null,
        data.batch_unit || null,
        data.prep_time_minutes !== undefined ? Number(data.prep_time_minutes) : null,
        data.chef_notes !== undefined ? data.chef_notes : null,
        photoUrl,
        data.is_frequent !== undefined ? (data.is_frequent ? 1 : 0) : null,
        now,
        user.business_id,
        id
      );

      if (data.ingredients) {
        let parsedIngredients = [];
        if (typeof data.ingredients === 'string') {
          try {
            parsedIngredients = JSON.parse(data.ingredients);
          } catch (_) {}
        } else if (Array.isArray(data.ingredients)) {
          parsedIngredients = data.ingredients;
        }

        if (parsedIngredients.length > 0) {
          db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);
          const insertIng = db.prepare(`
            INSERT INTO recipe_ingredients (
              id, recipe_id, raw_material_id, quantity, unit, sort_order, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          parsedIngredients.forEach((ing, idx) => {
            insertIng.run(
              'ing_' + crypto.randomUUID(),
              id,
              ing.raw_material_id,
              Number(ing.quantity),
              ing.unit || 'kg',
              idx + 1,
              ing.notes || null,
              now
            );
          });
        }
      }

      recordAudit(db, user, 'recipes', id, 'update', existing, data);
      return this.getRecipeById(user.business_id, id);
    })();
  },

  deleteRecipe(user, id) {
    const db = getDatabase();
    const existing = this.getRecipeById(user.business_id, id);
    if (!existing) {
      throw new Error('Recipe not found.');
    }

    db.prepare('UPDATE recipes SET is_active = 0, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      id
    );

    recordAudit(db, user, 'recipes', id, 'delete', existing, null);
    return { success: true };
  },

  // ==========================================
  // 3. SAILESH BHAI’S WEIGHING SHEET & BATCHES
  // ==========================================

  calculateWeighingSheet(businessId, recipeId, targetWeight) {
    const recipe = this.getRecipeById(businessId, recipeId);
    if (!recipe) {
      throw new Error('Recipe not found.');
    }

    const target = Number(targetWeight);
    if (isNaN(target) || target <= 0) {
      throw new Error('Target batch weight must be greater than zero.');
    }

    const scaleFactor = target / recipe.base_batch_size;
    let allInStock = true;

    const scaledIngredients = recipe.ingredients.map(ing => {
      const scaledQty = Math.round(ing.quantity * scaleFactor * 1000) / 1000;
      const wholeKg = Math.floor(scaledQty);
      const grams = Math.round((scaledQty - wholeKg) * 1000);

      // Large weighing scale display text (designed to be read 2-3 feet away)
      let largeWeightLabel = '';
      if (wholeKg > 0 && grams > 0) {
        largeWeightLabel = `${wholeKg} Kg ${grams} g`;
      } else if (wholeKg > 0) {
        largeWeightLabel = `${wholeKg} Kg`;
      } else {
        largeWeightLabel = `${grams} g`;
      }

      const hasSufficientStock = ing.current_stock >= scaledQty;
      if (!hasSufficientStock) {
        allInStock = false;
      }

      const shortage = hasSufficientStock ? 0 : Math.round((scaledQty - ing.current_stock) * 1000) / 1000;

      return {
        raw_material_id: ing.raw_material_id,
        material_name_en: ing.material_name_en,
        material_name_gu: ing.material_name_gu,
        category: ing.material_category,
        base_unit: ing.base_unit,
        required_quantity: scaledQty,
        whole_kg: wholeKg,
        grams: grams,
        large_weight_label: largeWeightLabel,
        current_stock: ing.current_stock,
        formatted_stock: ing.formatted_stock,
        has_sufficient_stock: hasSufficientStock,
        shortage: shortage,
        notes: ing.notes || null,
        is_checked: false
      };
    });

    return {
      recipe: {
        id: recipe.id,
        name_en: recipe.name_en,
        name_gu: recipe.name_gu,
        category: recipe.category,
        base_batch_size: recipe.base_batch_size,
        batch_unit: recipe.batch_unit,
        chef_notes: recipe.chef_notes,
        photo_url: recipe.photo_url
      },
      target_weight: target,
      scale_factor: scaleFactor,
      all_in_stock: allInStock,
      ingredients: scaledIngredients
    };
  },

  createProductionBatch(user, batchData) {
    const db = getDatabase();
    const {
      recipe_id,
      target_weight,
      chef_name,
      chef_id,
      notes,
      consumptions
    } = batchData;

    const recipe = this.getRecipeById(user.business_id, recipe_id);
    if (!recipe) {
      throw new Error('Recipe not found.');
    }

    const target = Number(target_weight);
    if (isNaN(target) || target <= 0) {
      throw new Error('Target batch weight must be greater than zero.');
    }

    const scaleFactor = target / recipe.base_batch_size;
    const batchId = 'bat_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10);
    const dateCompact = dateStr.replace(/-/g, '');
    const batchNumber = `BATCH-${dateCompact}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    return db.transaction(() => {
      // 1. Create production batch
      db.prepare(`
        INSERT INTO production_batches (
          id, business_id, batch_number, recipe_id, product_name_en,
          product_name_gu, target_weight, weight_unit, scale_factor,
          production_date, chef_id, chef_name, status, notes,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'kg', ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
      `).run(
        batchId,
        user.business_id,
        batchNumber,
        recipe.id,
        recipe.name_en,
        recipe.name_gu,
        target,
        scaleFactor,
        dateStr,
        chef_id || user.id,
        chef_name || user.full_name || 'Sailesh Bhai',
        notes || null,
        user.id,
        now,
        now
      );

      // 2. Process ingredient consumptions and automatic stock deduction
      const insertConsumption = db.prepare(`
        INSERT INTO batch_consumptions (
          id, batch_id, raw_material_id, material_name_en, material_name_gu,
          required_quantity, actual_quantity, unit, is_checked, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE raw_materials SET current_stock = ?, updated_at = ? WHERE id = ?
      `);

      const insertStx = db.prepare(`
        INSERT INTO stock_transactions (
          id, business_id, raw_material_id, transaction_type,
          quantity, unit, base_quantity, stock_before, stock_after,
          reference_id, reference_type, notes, recorded_by, created_at
        ) VALUES (?, ?, ?, 'outward_production', ?, ?, ?, ?, ?, ?, 'production_batch', ?, ?, ?)
      `);

      const consumedList = [];

      for (const ing of recipe.ingredients) {
        const calculatedQty = Math.round(ing.quantity * scaleFactor * 1000) / 1000;
        
        // Find custom override if supplied in consumptions array
        const match = Array.isArray(consumptions) ? consumptions.find(c => c.raw_material_id === ing.raw_material_id) : null;
        const actualQty = match && Number(match.actual_quantity) > 0 ? Number(match.actual_quantity) : calculatedQty;
        const isChecked = match ? (match.is_checked ? 1 : 0) : 1;

        // Current stock deduction
        const mat = db.prepare('SELECT current_stock FROM raw_materials WHERE id = ?').get(ing.raw_material_id);
        const stockBefore = mat ? mat.current_stock : 0;
        const stockAfter = Math.max(0, stockBefore - actualQty);

        updateStock.run(stockAfter, now, ing.raw_material_id);

        insertConsumption.run(
          'bcon_' + crypto.randomUUID(),
          batchId,
          ing.raw_material_id,
          ing.material_name_en,
          ing.material_name_gu,
          calculatedQty,
          actualQty,
          ing.base_unit || 'kg',
          isChecked,
          now
        );

        insertStx.run(
          'stx_' + crypto.randomUUID(),
          user.business_id,
          ing.raw_material_id,
          actualQty,
          ing.base_unit || 'kg',
          -actualQty,
          stockBefore,
          stockAfter,
          batchId,
          `Production Batch: ${recipe.name_en} (${target} kg)`,
          user.id,
          now
        );

        consumedList.push({
          material_name: ing.material_name_en,
          actual_quantity: actualQty,
          stock_after: stockAfter
        });
      }

      recordAudit(db, user, 'production_batches', batchId, 'create', null, {
        batchNumber,
        product: recipe.name_en,
        weight: target,
        ingredientsCount: recipe.ingredients.length
      });

      return {
        id: batchId,
        batch_number: batchNumber,
        product_name_en: recipe.name_en,
        product_name_gu: recipe.name_gu,
        target_weight: target,
        chef_name: chef_name || user.full_name,
        production_date: dateStr,
        consumed: consumedList
      };
    })();
  },

  getProductionBatches(businessId, options = {}) {
    const db = getDatabase();
    let query = `
      SELECT pb.*, u.full_name as created_by_name
      FROM production_batches pb
      LEFT JOIN users u ON u.id = pb.created_by
      WHERE pb.business_id = ?
    `;
    const params = [businessId];

    if (options.date) {
      query += ` AND pb.production_date = ?`;
      params.push(options.date);
    }

    if (options.search) {
      const term = `%${options.search.trim()}%`;
      query += ` AND (pb.product_name_en LIKE ? OR pb.product_name_gu LIKE ? OR pb.batch_number LIKE ? OR pb.chef_name LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY pb.created_at DESC, pb.rowid DESC LIMIT ?`;
    params.push(options.limit || 50);

    const rows = db.prepare(query).all(...params);

    return rows.map(r => {
      const consumptions = db.prepare(`
        SELECT * FROM batch_consumptions WHERE batch_id = ? ORDER BY material_name_en ASC
      `).all(r.id);
      return {
        ...r,
        consumptions
      };
    });
  },

  getProductionBatchById(businessId, id) {
    const db = getDatabase();
    const batch = db.prepare(`
      SELECT pb.*, u.full_name as created_by_name
      FROM production_batches pb
      LEFT JOIN users u ON u.id = pb.created_by
      WHERE pb.business_id = ? AND pb.id = ?
    `).get(businessId, id);

    if (!batch) return null;

    const consumptions = db.prepare(`
      SELECT * FROM batch_consumptions WHERE batch_id = ? ORDER BY material_name_en ASC
    `).all(id);

    return {
      ...batch,
      consumptions
    };
  },

  // ==========================================
  // 4. OWNER DASHBOARD & INVENTORY STATS
  // ==========================================

  getInventoryDashboardStats(businessId) {
    const db = getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    const materialsCount = db.prepare(`
      SELECT COUNT(*) as total FROM raw_materials WHERE business_id = ? AND is_active = 1
    `).get(businessId)?.total || 0;

    const lowStockMaterials = db.prepare(`
      SELECT rm.*, v.name as supplier_name, v.phone as supplier_phone
      FROM raw_materials rm
      LEFT JOIN vendors v ON v.id = rm.supplier_vendor_id
      WHERE rm.business_id = ? AND rm.is_active = 1 AND rm.current_stock <= rm.min_stock_alert
      ORDER BY (rm.current_stock / CASE WHEN rm.min_stock_alert = 0 THEN 1 ELSE rm.min_stock_alert END) ASC
    `).all(businessId).map(m => ({
      ...m,
      formatted_stock: formatStockDisplay(m.current_stock, m.primary_unit, m.base_unit)
    }));

    const todayBatches = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(target_weight), 0) as total_kg
      FROM production_batches
      WHERE business_id = ? AND production_date = ? AND status = 'completed'
    `).get(businessId, today) || { count: 0, total_kg: 0 };

    const recentBatches = db.prepare(`
      SELECT id, batch_number, product_name_en, product_name_gu, target_weight, chef_name, created_at
      FROM production_batches
      WHERE business_id = ?
      ORDER BY created_at DESC, rowid DESC LIMIT 5
    `).all(businessId);

    return {
      total_materials: materialsCount,
      low_stock_count: lowStockMaterials.length,
      low_stock_items: lowStockMaterials,
      today_batches_count: todayBatches.count,
      today_total_kg: todayBatches.total_kg,
      recent_batches: recentBatches
    };
  }
};

export default ManufacturingService;

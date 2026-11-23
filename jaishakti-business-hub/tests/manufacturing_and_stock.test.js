import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../server/db/index.js';
import ManufacturingService, {
  formatStockDisplay,
  UNIT_DEFINITIONS
} from '../server/services/manufacturingService.js';
import VendorService from '../server/services/vendorService.js';

describe('Phase 2 (Part B): Manufacturing, Recipe Vault & Raw Materials Stock Tests', () => {
  let db;
  const testBizId = 'biz_jaishakti_001';
  const ownerUser = {
    id: 'usr_owner_001',
    username: 'admin',
    full_name: 'Bharat Rana (Owner)',
    role: 'owner',
    business_id: testBizId
  };
  const chefUser = {
    id: 'usr_staff_001',
    username: 'sailesh',
    full_name: 'Sailesh Bhai (Head Chef)',
    role: 'staff',
    business_id: testBizId,
    permissions: { can_record_production: true }
  };

  before(() => {
    db = getDatabase();
    db.prepare("UPDATE business_settings SET recipe_vault_pin = '1984' WHERE business_id = ?").run(testBizId);
  });

  // ==========================================
  // MODULE 1: PIN-PROTECTED RECIPE VAULT
  // ==========================================
  describe('1. PIN-Protected Recipe Vault (રેસિપી તિજોરી)', () => {
    test('Default 4-digit PIN (1984) verifies successfully and rejects invalid PIN', () => {
      const validRes = ManufacturingService.verifyRecipeVaultPin(testBizId, '1984');
      assert.equal(validRes.valid, true);

      const invalidRes = ManufacturingService.verifyRecipeVaultPin(testBizId, '0000');
      assert.equal(invalidRes.valid, false);
      assert.ok(invalidRes.error);
    });

    test('Owner can change secret PIN and verify new PIN replaces old one', () => {
      // Change from 1984 to 7890
      const changeRes = ManufacturingService.changeRecipeVaultPin(ownerUser, '1984', '7890');
      assert.equal(changeRes.success, true);

      // Old PIN fails
      const oldCheck = ManufacturingService.verifyRecipeVaultPin(testBizId, '1984');
      assert.equal(oldCheck.valid, false);

      // New PIN succeeds
      const newCheck = ManufacturingService.verifyRecipeVaultPin(testBizId, '7890');
      assert.equal(newCheck.valid, true);

      // Revert back to 1984 for clean consistency
      ManufacturingService.changeRecipeVaultPin(ownerUser, '7890', '1984');
      assert.equal(ManufacturingService.verifyRecipeVaultPin(testBizId, '1984').valid, true);
    });

    test('Create new recipe with scalable ingredients blueprint and dual language names', () => {
      const materials = ManufacturingService.getRawMaterials(testBizId);
      const chanaDal = materials.find(m => m.id === 'rm_chana_dal_30kg') || materials[0];
      const oil = materials.find(m => m.id === 'rm_cottonseed_rani_15kg') || materials[1];

      const recipe = ManufacturingService.createRecipe(ownerUser, {
        name_en: 'Methi Gota',
        name_gu: 'મેથીના ગોટા',
        category: 'daily_farsan',
        base_batch_size: 10,
        batch_unit: 'kg',
        prep_time_minutes: 30,
        chef_notes: 'Add fresh chopped fenugreek and crushed black peppercorns. Fry on gentle medium flame.',
        is_frequent: 1,
        ingredients: [
          { raw_material_id: chanaDal.id, quantity: 6.0, unit: 'kg', notes: 'Course ground' },
          { raw_material_id: oil.id, quantity: 1.5, unit: 'kg', notes: 'Frying absorption' }
        ]
      });

      assert.ok(recipe.id);
      assert.equal(recipe.name_en, 'Methi Gota');
      assert.equal(recipe.name_gu, 'મેથીના ગોટા');
      assert.equal(recipe.base_batch_size, 10);
      assert.equal(recipe.ingredients.length, 2);

      // Retrieve by ID
      const retrieved = ManufacturingService.getRecipeById(testBizId, recipe.id);
      assert.equal(retrieved.name_gu, 'મેથીના ગોટા');
      assert.equal(retrieved.ingredients[0].material_name_en, chanaDal.name_en);
    });

    test('Reject recipe creation when missing required names or zero ingredients', () => {
      assert.throws(() => {
        ManufacturingService.createRecipe(ownerUser, {
          name_en: '',
          name_gu: '',
          ingredients: []
        });
      }, /required/i);
    });
  });

  // ==========================================
  // MODULE 2: RAW MATERIALS & STOCK MANAGEMENT
  // ==========================================
  describe('2. Raw Materials & Stock Management (કાચો માલ અને સ્ટોક)', () => {
    test('Farsan-native UOM display correctly converts kg to bags, tins, cylinders', () => {
      // 50kg bag (e.g. Besan 350 kg = 7.0 Bags)
      const bagDisplay = formatStockDisplay(350, 'bag_50kg', 'kg');
      assert.equal(bagDisplay, '7.0 Bags (350.0 Kg)');

      // 15kg oil tin (e.g. Singtel 120 kg = 8.0 Tins)
      const tinDisplay = formatStockDisplay(120, 'tin_15kg', 'kg');
      assert.equal(tinDisplay, '8.0 Tins (120.0 Kg)');

      // 19kg commercial LPG cylinder
      const cylDisplay = formatStockDisplay(6, 'cylinder_19kg', 'cylinder');
      assert.equal(cylDisplay, '6 Cylinders');

      // Pieces
      const pcsDisplay = formatStockDisplay(1200, 'piece', 'piece');
      assert.equal(pcsDisplay, '1200 Pcs');
    });

    test('Detect low stock threshold warning badges accurately', () => {
      const materials = ManufacturingService.getRawMaterials(testBizId);
      const testMat = materials.find(m => m.id === 'rm_potatoes_fresh') || materials[0];
      assert.ok(testMat);

      const origStock = testMat.current_stock;
      // Set stock below threshold
      db.prepare('UPDATE raw_materials SET current_stock = 1 WHERE id = ?').run(testMat.id);

      const refreshed = ManufacturingService.getRawMaterialById(testBizId, testMat.id);
      assert.equal(refreshed.is_low_stock, true);

      // Low stock query returns it
      const lowStockList = ManufacturingService.getRawMaterials(testBizId, { lowStockOnly: true });
      assert.ok(lowStockList.some(m => m.id === testMat.id));

      // Restore stock back
      db.prepare('UPDATE raw_materials SET current_stock = ? WHERE id = ?').run(origStock, testMat.id);
      assert.equal(ManufacturingService.getRawMaterialById(testBizId, testMat.id).is_low_stock, false);
    });

    test('Manual stock adjustments record transaction logs and update current stock balance', () => {
      const materials = ManufacturingService.getRawMaterials(testBizId);
      const kopra = materials.find(m => m.id === 'rm_kopra_sali_5pct') || materials[0];
      const initialStock = kopra.current_stock;

      // Inward arrival of 25 kg
      const inwardRes = ManufacturingService.adjustStock(ownerUser, kopra.id, {
        transaction_type: 'inward_manual',
        quantity: 25,
        unit: 'kg',
        notes: 'Local market purchase'
      });
      assert.equal(inwardRes.stockAfter, initialStock + 25);

      // Spoilage / Loss adjustment of 5 kg
      const lossRes = ManufacturingService.adjustStock(ownerUser, kopra.id, {
        transaction_type: 'adjustment_loss',
        quantity: 5,
        unit: 'kg',
        notes: 'Moisture damage in monsoon'
      });
      assert.equal(lossRes.stockAfter, initialStock + 20);

      // Verify stock transactions history
      const txs = ManufacturingService.getStockTransactions(testBizId, { materialId: kopra.id });
      assert.ok(txs.length >= 2);
      assert.equal(txs[0].transaction_type, 'adjustment_loss');
      assert.equal(txs[1].transaction_type, 'inward_manual');

      // Revert stock
      db.prepare('UPDATE raw_materials SET current_stock = ? WHERE id = ?').run(initialStock, kopra.id);
    });
  });

  // ==========================================
  // MODULE 3: DIGITAL WEIGHING SHEET
  // ==========================================
  describe('3. Sailesh Bhai’s Weighing Sheet Calculation & Scaling', () => {
    test('Scale 10 Kg base Bhakharwadi recipe to 50 Kg batch with exact Kg/Grams breakdown', () => {
      const bhakharwadi = db.prepare("SELECT id FROM recipes WHERE name_en = 'Bhakharwadi'").get();
      assert.ok(bhakharwadi);

      const sheet = ManufacturingService.calculateWeighingSheet(testBizId, bhakharwadi.id, 50);

      assert.equal(sheet.target_weight, 50);
      assert.equal(sheet.scale_factor, 5); // 50 / 10 = 5x

      // Check ingredient scaling:
      // Base Maida: 4.0 kg -> 5x = 20.0 Kg
      const maida = sheet.ingredients.find(i => i.material_name_en.includes('Maida'));
      assert.ok(maida);
      assert.equal(maida.required_quantity, 20.0);
      assert.equal(maida.large_weight_label, '20 Kg');

      // Base Chana Dal: 1.0 kg -> 5x = 5.0 Kg
      const chana = sheet.ingredients.find(i => i.material_name_en.includes('Chana'));
      assert.ok(chana);
      assert.equal(chana.required_quantity, 5.0);
      assert.equal(chana.large_weight_label, '5 Kg');

      // Base Cottonseed Oil: 2.0 kg -> 5x = 10.0 Kg
      const oil = sheet.ingredients.find(i => i.material_name_en.includes('Oil'));
      assert.ok(oil);
      assert.equal(oil.required_quantity, 10.0);
      assert.equal(oil.large_weight_label, '10 Kg');

      // Base Kopra Sali: 0.8 kg -> 5x = 4.0 kg
      const kopra = sheet.ingredients.find(i => i.material_name_en.includes('Kopra'));
      assert.ok(kopra);
      assert.equal(kopra.required_quantity, 4.0);
      assert.equal(kopra.large_weight_label, '4 Kg');

      // All ingredients available in stock check
      assert.equal(typeof sheet.all_in_stock, 'boolean');
    });

    test('Warn chef when target batch exceeds available ingredient stock in inventory', () => {
      const bhakharwadi = db.prepare("SELECT id FROM recipes WHERE name_en = 'Bhakharwadi'").get();

      // Ask for unrealistic 2,000 Kg batch
      const hugeSheet = ManufacturingService.calculateWeighingSheet(testBizId, bhakharwadi.id, 2000);
      assert.equal(hugeSheet.all_in_stock, false);

      const insufficientItems = hugeSheet.ingredients.filter(i => !i.has_sufficient_stock);
      assert.ok(insufficientItems.length > 0);
      assert.ok(insufficientItems[0].shortage > 0);
    });
  });

  // ==========================================
  // MODULE 4: AUTOMATIC STOCK DEDUCTION ENGINE
  // ==========================================
  describe('4. Automatic Stock Deduction Engine & Production Batches', () => {
    test('Confirming batch automatically deducts raw materials and creates audit records', () => {
      const bhakharwadi = db.prepare("SELECT id FROM recipes WHERE name_en = 'Bhakharwadi'").get();

      // Read stocks before batch
      const maidaBefore = db.prepare("SELECT current_stock FROM raw_materials WHERE id = 'rm_maida_50kg'").get().current_stock;
      const oilBefore = db.prepare("SELECT current_stock FROM raw_materials WHERE id = 'rm_cottonseed_rani_15kg'").get().current_stock;

      // Produce 20 Kg batch (2x base)
      // Maida required: 4 * 2 = 8 Kg
      // Singtel/Oil required: 2 * 2 = 4 Kg
      const batchRes = ManufacturingService.createProductionBatch(chefUser, {
        recipe_id: bhakharwadi.id,
        target_weight: 20,
        chef_name: 'Sailesh Bhai',
        notes: 'Morning fresh farsan batch'
      });

      assert.ok(batchRes.id);
      assert.ok(batchRes.batch_number.startsWith('BATCH-'));
      assert.equal(batchRes.target_weight, 20);

      // Verify stock was deducted accurately
      const maidaAfter = db.prepare("SELECT current_stock FROM raw_materials WHERE id = 'rm_maida_50kg'").get().current_stock;
      const oilAfter = db.prepare("SELECT current_stock FROM raw_materials WHERE id = 'rm_cottonseed_rani_15kg'").get().current_stock;

      assert.equal(maidaAfter, maidaBefore - 8);
      assert.equal(oilAfter, oilBefore - 4);

      // Verify stock transactions created with outward_production
      const prodStx = db.prepare(`
        SELECT * FROM stock_transactions
        WHERE reference_id = ? AND transaction_type = 'outward_production'
      `).all(batchRes.id);
      assert.ok(prodStx.length > 0);
      assert.ok(prodStx.every(t => t.base_quantity < 0));

      // Verify batch consumptions logged
      const consumptions = db.prepare('SELECT * FROM batch_consumptions WHERE batch_id = ?').all(batchRes.id);
      assert.ok(consumptions.length > 0);

      // Revert stocks
      db.prepare("UPDATE raw_materials SET current_stock = ? WHERE id = 'rm_maida_50kg'").run(maidaBefore);
      db.prepare("UPDATE raw_materials SET current_stock = ? WHERE id = 'rm_cottonseed_rani_15kg'").run(oilBefore);
    });

    test('Dashboard inventory stats reflect live stock and today production count', () => {
      const stats = ManufacturingService.getInventoryDashboardStats(testBizId);

      assert.ok(stats.total_materials >= 15);
      assert.equal(typeof stats.low_stock_count, 'number');
      assert.ok(Array.isArray(stats.low_stock_items));
      assert.ok(Array.isArray(stats.recent_batches));
      assert.equal(typeof stats.today_batches_count, 'number');
    });
  });

  // ==========================================
  // MODULE 5: BILL OCR INWARD STOCK INTEGRATION
  // ==========================================
  describe('5. Bill OCR Inward Stock Integration (1-Click Dual Action)', () => {
    test('Vendor delivery bill auto-increments raw material inventory stock', () => {
      const chanaDal = db.prepare("SELECT current_stock FROM raw_materials WHERE id = 'rm_chana_dal_30kg'").get();
      const initialStock = chanaDal.current_stock;

      // Inward 2 bags of Chana Dal (2 * 30 kg = 60 kg)
      const inwardItems = [
        {
          raw_material_id: 'rm_chana_dal_30kg',
          quantity: 2,
          unit: 'bag_30kg',
          notes: 'Satguru delivery bill'
        }
      ];

      const res = ManufacturingService.inwardStockFromBill(ownerUser, 'bill_test_ocr_001', inwardItems);
      assert.equal(res.count, 1);

      const chanaDalAfter = db.prepare("SELECT current_stock FROM raw_materials WHERE id = 'rm_chana_dal_30kg'").get().current_stock;
      assert.equal(chanaDalAfter, initialStock + 60);

      // Check stock transaction logged
      const stx = db.prepare("SELECT * FROM stock_transactions WHERE reference_id = 'bill_test_ocr_001'").get();
      assert.ok(stx);
      assert.equal(stx.transaction_type, 'inward_ocr');
      assert.equal(stx.base_quantity, 60);

      // Revert stock
      db.prepare("UPDATE raw_materials SET current_stock = ? WHERE id = 'rm_chana_dal_30kg'").run(initialStock);
    });
  });

  // ==========================================
  // MODULE 6: 3-TIER INVENTORY & PACKAGING RUNS
  // ==========================================
  describe('6. 3-Tier Inventory Architecture & Packaging Runs', () => {
    test('Retrieve Tier 2 loose finished products with their packaged retail variants', () => {
      const finishedProducts = ManufacturingService.getFinishedProducts(testBizId);
      assert.ok(finishedProducts.length >= 5);

      const bhakharwadi = finishedProducts.find(fp => fp.id === 'fp_bhakharwadi');
      assert.ok(bhakharwadi);
      assert.equal(bhakharwadi.name_gu, 'ભાખરવડી');
      assert.ok(bhakharwadi.current_loose_stock > 0);
      assert.ok(bhakharwadi.packages.length >= 2);

      const p250 = bhakharwadi.packages.find(p => p.package_weight_grams === 250);
      assert.ok(p250);
      assert.equal(p250.barcode, 'JS-BHAK-250');
      assert.equal(p250.selling_price, 90);
    });

    test('Manual stock adjustment on loose finished farsan (gain/loss)', () => {
      const fp = ManufacturingService.getFinishedProductById(testBizId, 'fp_ratlami_sev');
      const initialStock = fp.current_loose_stock;

      // Add 5 kg loose stock
      const adjustRes = ManufacturingService.adjustLooseStock(ownerUser, 'fp_ratlami_sev', {
        transaction_type: 'inward_manual',
        quantity: 5,
        notes: 'Extra kitchen batch tray'
      });
      assert.equal(adjustRes.stockAfter, initialStock + 5);

      // Revert
      ManufacturingService.adjustLooseStock(ownerUser, 'fp_ratlami_sev', {
        transaction_type: 'adjustment_loss',
        quantity: 5,
        notes: 'Revert test'
      });
    });

    test('Record packaging run: deducts loose weight and credits retail packet counts', () => {
      const bhakharwadiBefore = ManufacturingService.getFinishedProductById(testBizId, 'fp_bhakharwadi');
      const looseBefore = bhakharwadiBefore.current_loose_stock;
      const pkg250Before = bhakharwadiBefore.packages.find(p => p.package_weight_grams === 250).current_packet_stock;
      const pkg500Before = bhakharwadiBefore.packages.find(p => p.package_weight_grams === 500).current_packet_stock;

      // Pack 20x 250g (5 kg) and 10x 500g (5 kg) = 10 kg total
      const runRes = ManufacturingService.recordPackagingRun(ownerUser, {
        finished_product_id: 'fp_bhakharwadi',
        notes: 'Morning packing station run',
        items: [
          { packaged_product_id: 'pkg_bhak_250', packet_count: 20 },
          { packaged_product_id: 'pkg_bhak_500', packet_count: 10 }
        ]
      });

      assert.ok(runRes.id);
      assert.ok(runRes.run_number.startsWith('PKG-'));
      assert.equal(runRes.total_weight_deducted, 10.0);
      assert.equal(runRes.loose_stock_after, looseBefore - 10.0);

      // Verify finished product loose stock was deducted
      const bhakharwadiAfter = ManufacturingService.getFinishedProductById(testBizId, 'fp_bhakharwadi');
      assert.equal(bhakharwadiAfter.current_loose_stock, looseBefore - 10.0);

      // Verify packaged products stock was incremented
      const p250After = bhakharwadiAfter.packages.find(p => p.package_weight_grams === 250);
      const p500After = bhakharwadiAfter.packages.find(p => p.package_weight_grams === 500);
      assert.equal(p250After.current_packet_stock, pkg250Before + 20);
      assert.equal(p500After.current_packet_stock, pkg500Before + 10);

      // Verify packaging run was logged
      const runs = ManufacturingService.getPackagingRuns(testBizId, { finished_product_id: 'fp_bhakharwadi' });
      assert.ok(runs.length >= 1);
      assert.equal(runs[0].total_weight_deducted, 10.0);
      assert.equal(runs[0].items.length, 2);
    });

    test('Reject packaging run when requested weight exceeds available loose stock', () => {
      const bhakharwadi = ManufacturingService.getFinishedProductById(testBizId, 'fp_bhakharwadi');
      const availableLoose = bhakharwadi.current_loose_stock;

      // Attempt to pack 1,000 packets of 500g = 500 kg (far exceeds available loose stock)
      assert.throws(() => {
        ManufacturingService.recordPackagingRun(ownerUser, {
          finished_product_id: 'fp_bhakharwadi',
          items: [
            { packaged_product_id: 'pkg_bhak_500', packet_count: 1000 }
          ]
        });
      }, /Cannot pack/);
    });

    test('Kitchen batch completion automatically credits loose stock of matched finished product', () => {
      const bhakharwadiBefore = ManufacturingService.getFinishedProductById(testBizId, 'fp_bhakharwadi');
      const looseBefore = bhakharwadiBefore.current_loose_stock;

      // Complete a 10 kg Bhakharwadi production batch
      const batchRes = ManufacturingService.createProductionBatch(chefUser, {
        recipe_id: 'rcp_bhakharwadi_01',
        target_weight: 10,
        chef_name: 'Sailesh Bhai',
        notes: 'Fresh afternoon batch'
      });

      assert.equal(batchRes.loose_stock_credited, true);
      assert.equal(batchRes.finished_product_name, 'Bhakharwadi');

      // Verify loose stock increased by exactly 10 kg
      const bhakharwadiAfter = ManufacturingService.getFinishedProductById(testBizId, 'fp_bhakharwadi');
      assert.equal(bhakharwadiAfter.current_loose_stock, looseBefore + 10);
    });

    test('Dashboard inventory stats reflect 3 tiers (raw materials, loose farsan kg, retail packets)', () => {
      const stats = ManufacturingService.getInventoryDashboardStats(testBizId);
      assert.ok(stats.total_materials > 0);
      assert.ok(stats.total_loose_count > 0);
      assert.ok(stats.total_loose_kg > 0);
      assert.ok(stats.total_packaged_count > 0);
      assert.ok(stats.total_retail_packets > 0);
    });
  });
});

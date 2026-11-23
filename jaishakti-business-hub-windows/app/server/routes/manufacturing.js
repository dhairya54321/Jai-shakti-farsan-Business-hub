import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import { uploadAttachment } from '../middleware/upload.js';
import ManufacturingService, {
  RAW_MATERIAL_CATEGORIES,
  UNIT_DEFINITIONS,
  RECIPE_CATEGORIES
} from '../services/manufacturingService.js';
import config from '../config.js';

const router = express.Router();

// All manufacturing routes require authentication
router.use(authenticateToken);

// ==========================================
// METADATA & DASHBOARD STATS
// ==========================================

// GET /api/manufacturing/uom-meta
router.get('/uom-meta', (req, res) => {
  res.json({
    success: true,
    categories: RAW_MATERIAL_CATEGORIES,
    units: Object.values(UNIT_DEFINITIONS),
    recipe_categories: RECIPE_CATEGORIES
  });
});

// GET /api/manufacturing/dashboard-stats - Live stats for Owner & Head Chef
router.get('/dashboard-stats', (req, res) => {
  try {
    const stats = ManufacturingService.getInventoryDashboardStats(req.user.business_id);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 1. RAW MATERIALS & STOCK INVENTORY
// ==========================================

// GET /api/manufacturing/materials
router.get('/materials', (req, res) => {
  try {
    const { category, search, low_stock } = req.query;
    const materials = ManufacturingService.getRawMaterials(req.user.business_id, {
      category,
      search,
      lowStockOnly: low_stock === 'true' || low_stock === '1'
    });
    res.json({ success: true, materials });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/materials/:id
router.get('/materials/:id', (req, res) => {
  try {
    const material = ManufacturingService.getRawMaterialById(req.user.business_id, req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, error: 'Raw material not found.' });
    }
    res.json({ success: true, material });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/materials
router.post('/materials', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to manage raw materials.' });
    }
    const material = ManufacturingService.createRawMaterial(req.user, req.body);
    res.status(201).json({ success: true, material });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/manufacturing/materials/:id
router.put('/materials/:id', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to update raw materials.' });
    }
    const updated = ManufacturingService.updateRawMaterial(req.user, req.params.id, req.body);
    res.json({ success: true, material: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/manufacturing/materials/:id
router.delete('/materials/:id', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete raw materials.' });
    }
    const result = ManufacturingService.deleteRawMaterial(req.user, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/materials/:id/adjust
router.post('/materials/:id/adjust', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to adjust stock.' });
    }
    const result = ManufacturingService.adjustStock(req.user, req.params.id, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/transactions
router.get('/transactions', (req, res) => {
  try {
    const { material_id, type, limit } = req.query;
    const transactions = ManufacturingService.getStockTransactions(req.user.business_id, {
      materialId: material_id,
      type,
      limit: parseInt(limit, 10) || 50
    });
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. RECIPE VAULT & PIN VERIFICATION
// ==========================================

// POST /api/manufacturing/recipes/verify-pin
router.post('/recipes/verify-pin', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'PIN is required.' });
    }
    const result = ManufacturingService.verifyRecipeVaultPin(req.user.business_id, pin);
    if (!result.valid) {
      return res.status(401).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/recipes/change-pin
router.post('/recipes/change-pin', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_recipes) {
      return res.status(403).json({ success: false, error: 'Only owners or managers can modify recipe PIN.' });
    }
    const { current_pin, new_pin } = req.body;
    const result = ManufacturingService.changeRecipeVaultPin(req.user, current_pin, new_pin);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/recipes
router.get('/recipes', (req, res) => {
  try {
    const { category, search, frequent } = req.query;
    const recipes = ManufacturingService.getRecipes(req.user.business_id, {
      category,
      search,
      frequentOnly: frequent === 'true' || frequent === '1'
    });
    res.json({ success: true, recipes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/recipes/:id
router.get('/recipes/:id', (req, res) => {
  try {
    const recipe = ManufacturingService.getRecipeById(req.user.business_id, req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found.' });
    }
    res.json({ success: true, recipe });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/recipes (Photo upload support)
router.post('/recipes', uploadAttachment.single('photo'), (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_recipes) {
      return res.status(403).json({ success: false, error: 'Unauthorized to add recipes.' });
    }
    const recipe = ManufacturingService.createRecipe(req.user, req.body, req.file);
    res.status(201).json({ success: true, recipe });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/manufacturing/recipes/:id
router.put('/recipes/:id', uploadAttachment.single('photo'), (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_recipes) {
      return res.status(403).json({ success: false, error: 'Unauthorized to edit recipes.' });
    }
    const updated = ManufacturingService.updateRecipe(req.user, req.params.id, req.body, req.file);
    res.json({ success: true, recipe: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/manufacturing/recipes/:id
router.delete('/recipes/:id', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_recipes) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete recipes.' });
    }
    const result = ManufacturingService.deleteRecipe(req.user, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/photos/:filename - Stream handwritten recipe card photo
router.get('/photos/:filename', (req, res) => {
  const filePath = path.join(config.UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Photo not found.' });
  }
  res.sendFile(filePath);
});

// ==========================================
// 3. WEIGHING SHEET & PRODUCTION BATCHES
// ==========================================

// POST /api/manufacturing/weighing-sheet - Compute scaled weights & stock sufficiency
router.post('/weighing-sheet', (req, res) => {
  try {
    const { recipe_id, target_weight } = req.body;
    if (!recipe_id || !target_weight) {
      return res.status(400).json({ success: false, error: 'Recipe ID and target weight are required.' });
    }
    const sheet = ManufacturingService.calculateWeighingSheet(req.user.business_id, recipe_id, target_weight);
    res.json({ success: true, sheet });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/batches - Confirm & Complete Batch (Auto Stock Deduction)
router.post('/batches', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_record_production) {
      return res.status(403).json({ success: false, error: 'Unauthorized to record production batches.' });
    }
    const batch = ManufacturingService.createProductionBatch(req.user, req.body);
    res.status(201).json({ success: true, batch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/batches
router.get('/batches', (req, res) => {
  try {
    const { date, search, limit } = req.query;
    const batches = ManufacturingService.getProductionBatches(req.user.business_id, {
      date,
      search,
      limit: parseInt(limit, 10) || 50
    });
    res.json({ success: true, batches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/batches/:id
router.get('/batches/:id', (req, res) => {
  try {
    const batch = ManufacturingService.getProductionBatchById(req.user.business_id, req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Production batch not found.' });
    }
    res.json({ success: true, batch });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. TIER 2: LOOSE FINISHED PRODUCTS
// ==========================================

// GET /api/manufacturing/finished-products
router.get('/finished-products', (req, res) => {
  try {
    const { category, search } = req.query;
    const products = ManufacturingService.getFinishedProducts(req.user.business_id, { category, search });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/finished-products/:id
router.get('/finished-products/:id', (req, res) => {
  try {
    const product = ManufacturingService.getFinishedProductById(req.user.business_id, req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Finished product not found.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/finished-products
router.post('/finished-products', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to add finished products.' });
    }
    const product = ManufacturingService.createFinishedProduct(req.user, req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/manufacturing/finished-products/:id
router.put('/finished-products/:id', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to update finished products.' });
    }
    const product = ManufacturingService.updateFinishedProduct(req.user, req.params.id, req.body);
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/manufacturing/finished-products/:id
router.delete('/finished-products/:id', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete finished products.' });
    }
    const result = ManufacturingService.deleteFinishedProduct(req.user, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/finished-products/:id/adjust
router.post('/finished-products/:id/adjust', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to adjust loose stock.' });
    }
    const result = ManufacturingService.adjustLooseStock(req.user, req.params.id, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. TIER 3: PACKAGED PRODUCTS & BARCODES
// ==========================================

// GET /api/manufacturing/packaged-products
router.get('/packaged-products', (req, res) => {
  try {
    const { finished_product_id, search, low_stock } = req.query;
    const products = ManufacturingService.getPackagedProducts(req.user.business_id, {
      finished_product_id,
      search,
      low_stock: low_stock === 'true' || low_stock === '1'
    });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/packaged-products
router.post('/packaged-products', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to add packaged product variant.' });
    }
    const variant = ManufacturingService.createPackagedVariant(req.user, req.body);
    res.status(201).json({ success: true, variant });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/manufacturing/packaged-products/:id
router.put('/packaged-products/:id', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to update packaged variant.' });
    }
    const variant = ManufacturingService.updatePackagedVariant(req.user, req.params.id, req.body);
    res.json({ success: true, variant });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/manufacturing/packaged-products/:id
router.delete('/packaged-products/:id', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete packaged variant.' });
    }
    const result = ManufacturingService.deletePackagedVariant(req.user, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturing/packaged-products/:id/adjust
router.post('/packaged-products/:id/adjust', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to adjust packet stock.' });
    }
    const result = ManufacturingService.adjustPackagedStock(req.user, req.params.id, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. PACKAGING RUNS (CONVERT LOOSE -> RETAIL)
// ==========================================

// POST /api/manufacturing/packaging-runs
router.post('/packaging-runs', (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.permissions?.can_record_production && !req.user.permissions?.can_manage_stock) {
      return res.status(403).json({ success: false, error: 'Unauthorized to record packaging runs.' });
    }
    const run = ManufacturingService.recordPackagingRun(req.user, req.body);
    res.status(201).json({ success: true, run });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturing/packaging-runs
router.get('/packaging-runs', (req, res) => {
  try {
    const { finished_product_id, limit } = req.query;
    const runs = ManufacturingService.getPackagingRuns(req.user.business_id, {
      finished_product_id,
      limit: parseInt(limit, 10) || 50
    });
    res.json({ success: true, runs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

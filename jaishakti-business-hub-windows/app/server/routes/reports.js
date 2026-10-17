import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import ReportService from '../services/reportService.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/reports/dashboard
router.get('/dashboard', (req, res) => {
  try {
    const data = ReportService.getDashboardMetrics(req.user.business_id, req.query.date);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/reports/expenses
router.get('/expenses', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const startDate = req.query.start_date || today;
    const endDate = req.query.end_date || today;
    const data = ReportService.getExpenseReport(req.user.business_id, {
      startDate,
      endDate,
      categoryId: req.query.category_id,
      vendorId: req.query.vendor_id
    });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/reports/vendors
router.get('/vendors', (req, res) => {
  try {
    const vendors = ReportService.getVendorReport(req.user.business_id, {
      startDate: req.query.start_date,
      endDate: req.query.end_date
    });
    res.json({ success: true, vendors });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/reports/staff
router.get('/staff', (req, res) => {
  try {
    const staff = ReportService.getStaffReport(req.user.business_id, {
      startDate: req.query.start_date,
      endDate: req.query.end_date
    });
    res.json({ success: true, staff });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/reports/cash
router.get('/cash', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const startDate = req.query.start_date || today;
    const endDate = req.query.end_date || today;
    const cashData = ReportService.getCashReport(req.user.business_id, { startDate, endDate });
    res.json({ success: true, ...cashData });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/reports/export-csv
router.get('/export-csv', (req, res) => {
  try {
    const csvContent = ReportService.generateCsvExport(req.user.business_id, req.query);
    const dateTag = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="JaiShakti_Expenses_${dateTag}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Export failed: ' + err.message });
  }
});

export default router;

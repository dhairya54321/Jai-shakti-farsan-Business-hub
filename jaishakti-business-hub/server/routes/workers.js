import express from 'express';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { uploadAttachment } from '../middleware/upload.js';
import { WorkerService, WORKER_ROLES } from '../services/workerService.js';
import { processWorkerDiaryPage } from '../services/ocrService.js';
import { getDatabase } from '../db/index.js';
import config from '../config.js';

const router = express.Router();
router.use(authenticateToken);

// Security guard: If authenticated user is a worker, they are restricted ONLY to their personal statement
router.use((req, res, next) => {
  if (req.user && req.user.role === 'worker') {
    if (req.path === '/my-statement' && req.method === 'GET') {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Access denied: Workers can only view their own personal passbook statement.'
    });
  }
  next();
});

/**
 * GET /api/workers/my-statement - Get self passbook statement for logged-in worker
 */
router.get('/my-statement', (req, res) => {
  try {
    const workerId = req.user.role === 'worker' ? req.user.worker_id : (req.query.worker_id || req.user.id);
    if (!workerId) {
      return res.status(400).json({ success: false, error: 'Worker ID is required' });
    }
    const result = WorkerService.getWorkerById(req.user.business_id, workerId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/workers/roles - Get predefined worker roles
 */
router.get('/roles', (req, res) => {
  res.json({ success: true, roles: WORKER_ROLES });
});

/**
 * GET /api/workers - List all workers with summary stats
 */
router.get('/', (req, res) => {
  try {
    const result = WorkerService.listWorkers(req.user.business_id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/workers/attendance - Get attendance for a specific date
 */
router.get('/attendance', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = WorkerService.getAttendanceForDate(req.user.business_id, date);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/workers/attendance - Record/batch update attendance for a date
 */
router.post('/attendance', (req, res) => {
  try {
    const { date, attendance } = req.body;
    if (!attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ success: false, error: 'attendance array is required' });
    }
    const result = WorkerService.recordAttendance(req.user.business_id, req.user.id, date, attendance);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/workers/:id - Get worker profile, transactions ledger & attendance
 */
router.get('/:id', (req, res) => {
  try {
    const result = WorkerService.getWorkerById(req.user.business_id, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/workers - Add new worker
 */
router.post('/', (req, res) => {
  try {
    const result = WorkerService.createWorker(req.user.business_id, req.user.id, req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/workers/:id - Update worker profile
 */
router.put('/:id', (req, res) => {
  try {
    const result = WorkerService.updateWorker(req.user.business_id, req.params.id, req.user.id, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/workers/:id - Delete or deactivate worker
 */
router.delete('/:id', (req, res) => {
  try {
    const result = WorkerService.deleteWorker(req.user.business_id, req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/workers/:id/transactions - Record advance given, returned, bonus, etc.
 */
router.post('/:id/transactions', (req, res) => {
  try {
    const result = WorkerService.addTransaction(req.user.business_id, req.user.id, {
      ...req.body,
      worker_id: req.params.id
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/workers/:id/transactions/:txId - Delete a ledger transaction
 */
router.delete('/:id/transactions/:txId', (req, res) => {
  try {
    const result = WorkerService.deleteTransaction(req.user.business_id, req.params.txId, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/workers/:id/settle-salary - Settle monthly salary with advance deduction
 */
router.post('/:id/settle-salary', (req, res) => {
  try {
    const result = WorkerService.settleMonthlySalary(req.user.business_id, req.user.id, {
      ...req.body,
      worker_id: req.params.id
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/workers/:id/pin - Update worker 4-digit PIN
 */
router.put('/:id/pin', (req, res) => {
  try {
    const { pin } = req.body;
    const result = WorkerService.updateWorkerPin(req.user.business_id, req.params.id, pin);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/workers/:id/leaves - Record worker leave
 */
router.post('/:id/leaves', (req, res) => {
  try {
    const result = WorkerService.recordLeave(req.user.business_id, req.user.id, {
      ...req.body,
      worker_id: req.params.id
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/workers/:id/leaves/:leaveId - Delete recorded leave
 */
router.delete('/:id/leaves/:leaveId', (req, res) => {
  try {
    const result = WorkerService.deleteLeave(req.user.business_id, req.params.leaveId, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/workers/scan-diary - Scan and parse handwritten worker diary page with OCR & AI
 */
router.post('/scan-diary', uploadAttachment.any(), async (req, res) => {
  const uploadedFile = (req.files && req.files[0]) || req.file;
  if (!uploadedFile) {
    return res.status(400).json({ success: false, error: 'No diary image or document uploaded.' });
  }

  try {
    const db = getDatabase();
    const settings = db.prepare('SELECT gemini_api_key FROM business_settings WHERE business_id = ?').get(req.user.business_id);
    const geminiApiKey = req.body.geminiApiKey || req.headers['x-gemini-api-key'] || settings?.gemini_api_key || config.GEMINI_API_KEY || null;

    const ocrResult = await processWorkerDiaryPage(uploadedFile.path, uploadedFile.mimetype, { geminiApiKey });

    // Try automatically matching detected worker name or page number
    let matchedWorkerId = null;
    let matchedWorkerName = null;
    const workers = db.prepare('SELECT id, name, diary_page FROM workers WHERE business_id = ? AND is_active = 1').all(req.user.business_id);

    if (ocrResult.workerName) {
      const searchName = ocrResult.workerName.toLowerCase().replace(/[()]/g, ' ').trim();
      const searchTokens = searchName.split(/\s+/).filter(t => t.length >= 2);
      const match = workers.find(w => {
        const wName = w.name.toLowerCase();
        return wName.includes(searchName) || searchName.includes(wName) ||
          searchTokens.some(tok => wName.includes(tok));
      });
      if (match) {
        matchedWorkerId = match.id;
        matchedWorkerName = match.name;
      }
    }

    if (!matchedWorkerId && ocrResult.diaryPage) {
      const pageStr = String(ocrResult.diaryPage);
      const pageMatch = workers.find(w => {
        if (!w.diary_page) return false;
        const wPage = String(w.diary_page);
        return pageStr === wPage || pageStr.split(/[-,\s]+/).includes(wPage);
      });
      if (pageMatch) {
        matchedWorkerId = pageMatch.id;
        matchedWorkerName = pageMatch.name;
      }
    }

    res.json({
      success: true,
      file: {
        path: `/api/expenses/attachments/${path.basename(uploadedFile.path)}`,
        originalName: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype
      },
      ...ocrResult,
      matchedWorkerId,
      matchedWorkerName
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/workers/batch-import-ledger - Batch import parsed ledger entries from old diary
 */
router.post('/batch-import-ledger', (req, res) => {
  try {
    const { worker_id, entries, file_info } = req.body;
    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'Worker selection is required.' });
    }
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one transaction entry is required.' });
    }

    const result = WorkerService.batchImportTransactions(req.user.business_id, req.user.id, worker_id, entries, file_info);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/workers/:id/diary-scans - Get all scanned diary photos for a worker
 */
router.get('/:id/diary-scans', (req, res) => {
  try {
    const scans = WorkerService.getWorkerDiaryScans(req.user.business_id, req.params.id);
    res.json({ success: true, scans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/workers/:id/diary-scans - Upload/attach a scanned diary photo
 */
router.post('/:id/diary-scans', uploadAttachment.any(), (req, res) => {
  try {
    const uploadedFile = (req.files && req.files[0]) || req.file;
    const filePath = uploadedFile ? `/api/expenses/attachments/${path.basename(uploadedFile.path)}` : req.body.file_path;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'File is required.' });
    }

    const scans = WorkerService.addWorkerDiaryScan(req.user.business_id, req.user.id, req.params.id, {
      file_path: filePath,
      original_name: uploadedFile ? uploadedFile.originalname : req.body.original_name,
      mime_type: uploadedFile ? uploadedFile.mimetype : req.body.mime_type,
      file_size: uploadedFile ? uploadedFile.size : req.body.file_size,
      diary_page: req.body.diary_page,
      notes: req.body.notes
    });
    res.status(201).json({ success: true, scans });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/workers/:id/diary-scans/:scanId - Remove a scanned diary photo
 */
router.delete('/:id/diary-scans/:scanId', (req, res) => {
  try {
    const result = WorkerService.deleteWorkerDiaryScan(req.user.business_id, req.params.scanId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import VoiceParserService from '../services/voiceParserService.js';

const router = express.Router();
router.use(authenticateToken);

// POST /api/voice/parse - Extract fields from spoken Gujarati or English transcript
router.post('/parse', (req, res) => {
  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ success: false, error: 'Transcript text is required.' });
  }

  try {
    const result = VoiceParserService.parseSpokenText(req.user.business_id, transcript);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

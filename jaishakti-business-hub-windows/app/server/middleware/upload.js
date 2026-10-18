import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import config from '../config.js';

config.ensureDirectories();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename to avoid directory traversal or collision
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `${Date.now()}_${crypto.randomBytes(12).toString('hex')}${ext}`;
    cb(null, randomName);
  }
});

const allowedMimes = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (allowedMimes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF attachments are permitted.'));
  }
};

export const uploadAttachment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export default uploadAttachment;

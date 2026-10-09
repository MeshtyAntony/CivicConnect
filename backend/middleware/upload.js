// backend/middleware/upload.js
// Safe photo uploads with Multer.
//  - only JPG / PNG / WebP, max 5 MB, one file, field name "photo"
//  - the saved filename is random (the uploaded filename is NEVER used)
//  - after saving, the file's first bytes are checked, so a renamed .exe/.html is rejected

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

// allowed MIME type -> file extension we save with
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const extension = ALLOWED_TYPES[file.mimetype];
    cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_PHOTO_BYTES,
    files: 1,
    fields: 20,
    fieldSize: 20 * 1024, // text fields (title, description...) up to 20 KB each
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    return cb(httpError(400, 'Only JPG, PNG or WebP images are allowed.'));
  },
});

// Turns Multer's errors into clean 400 / 413 errors for our JSON error handler.
function translateUploadError(err) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return httpError(413, 'Photo is too large. Maximum size is 5 MB.');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return httpError(400, 'Unexpected file. Send one image in a field named "photo".');
    }
    return httpError(400, `Upload error: ${err.message}`);
  }
  if (err.status) return err; // our own error from fileFilter
  if (err.code && /^E[A-Z0-9]+$/.test(err.code)) return err; // disk problem (ENOENT, EACCES...) -> 500
  return httpError(400, 'Invalid upload request.');
}

// Express middleware: runs Multer and reports its errors properly.
function uploadPhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) return next(translateUploadError(err));
    return next();
  });
}

// Reads the first bytes of the saved file and checks they really are the declared image type.
async function hasValidImageSignature(filePath, mimetype) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    if (bytesRead < 12) return false;

    if (mimetype === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimetype === 'image/png') {
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimetype === 'image/webp') {
      return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    }
    return false;
  } finally {
    await handle.close();
  }
}

// Removes an uploaded file (used when the report is rejected or the DB save fails).
async function deleteUploadedFile(file) {
  if (!file || !file.path) return;
  await fs.promises.unlink(file.path).catch(() => {});
}

module.exports = {
  UPLOAD_DIR,
  MAX_PHOTO_BYTES,
  uploadPhoto,
  translateUploadError,
  hasValidImageSignature,
  deleteUploadedFile,
};

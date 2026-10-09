// backend/routes/reports.js
// Step 2: create, list and fetch civic reports.
//   POST /api/reports        create a report (JSON, or multipart form with optional "photo")
//   GET  /api/reports        list reports (newest first), optional ?category= &status= &limit=
//   GET  /api/reports/:id    get one report

const express = require('express');
const { ObjectId } = require('mongodb');
const { uploadPhoto, hasValidImageSignature, deleteUploadedFile } = require('../middleware/upload');
const {
  CATEGORIES,
  STATUSES,
  validateReportInput,
  isValidObjectId,
  toReportResponse,
} = require('../utils/reportHelpers');

const router = express.Router();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

const reportsCollection = (req) => req.app.locals.db.collection('reports');

// Base address used to turn "/uploads/x.jpg" into a full URL for the frontend.
// Optional .env line:  PUBLIC_BASE_URL=http://localhost:5000
function baseUrl() {
  const configured = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return configured.replace(/\/+$/, '');
}

// ---------- POST /api/reports ----------
router.post('/', uploadPhoto, async (req, res) => {
  const file = req.file; // undefined when no photo was sent

  // Express 5 leaves req.body undefined when there is no body, so default to {}.
  const { errors, value } = validateReportInput(req.body ?? {});

  if (file && !(await hasValidImageSignature(file.path, file.mimetype))) {
    errors.photo = 'The uploaded file is not a valid JPG, PNG or WebP image.';
  }

  if (Object.keys(errors).length > 0) {
    await deleteUploadedFile(file); // don't leave orphan files from rejected reports
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const doc = {
    ...value,
    photo: file ? `/uploads/${file.filename}` : null, // path only, never Base64
    status: 'PENDING', // always PENDING at creation (client cannot choose)
    supportCount: 0,
    comments: [],
    createdAt: new Date(),
  };

  try {
    const result = await reportsCollection(req).insertOne(doc);
    doc._id = result.insertedId;
  } catch (error) {
    await deleteUploadedFile(file); // DB save failed -> remove the saved photo
    throw error; // Express 5 sends this to the error handler (500)
  }

  return res.status(201).json({
    message: 'Report created successfully',
    report: toReportResponse(doc, baseUrl()),
  });
});

// ---------- GET /api/reports ----------
router.get('/', async (req, res) => {
  const errors = {};
  const filter = {};

  // Query values must be plain strings (blocks ?category=a&category=b and similar tricks).
  const readQuery = (name) => {
    const raw = req.query[name];
    if (raw === undefined || raw === '') return null;
    if (typeof raw !== 'string') {
      errors[name] = `${name} must be a single value`;
      return null;
    }
    return raw.trim();
  };

  const category = readQuery('category');
  if (category !== null) {
    const normalized = category.toLowerCase();
    if (CATEGORIES.includes(normalized)) filter.category = normalized;
    else if (!errors.category) errors.category = `category must be one of: ${CATEGORIES.join(', ')}`;
  }

  const status = readQuery('status');
  if (status !== null) {
    const normalized = status.toUpperCase();
    if (STATUSES.includes(normalized)) filter.status = normalized;
    else if (!errors.status) errors.status = `status must be one of: ${STATUSES.join(', ')}`;
  }

  let limit = DEFAULT_LIMIT;
  const limitText = readQuery('limit');
  if (limitText !== null) {
    if (/^\d+$/.test(limitText) && Number(limitText) >= 1) limit = Math.min(Number(limitText), MAX_LIMIT);
    else if (!errors.limit) errors.limit = `limit must be a whole number from 1 to ${MAX_LIMIT}`;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Invalid query parameters', details: errors });
  }

  const docs = await reportsCollection(req)
    .find(filter)
    .sort({ createdAt: -1, _id: -1 }) // newest first
    .limit(limit)
    .toArray();

  const base = baseUrl();
  return res.json({
    count: docs.length,
    reports: docs.map((doc) => toReportResponse(doc, base)),
  });
});

// ---------- GET /api/reports/:id ----------
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid report ID' });
  }

  const doc = await reportsCollection(req).findOne({ _id: new ObjectId(req.params.id) });
  if (!doc) {
    return res.status(404).json({ error: 'Report not found' });
  }

  return res.json({ report: toReportResponse(doc, baseUrl()) });
});

module.exports = router;

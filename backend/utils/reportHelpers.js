// backend/utils/reportHelpers.js
// Pure helper functions for reports: allowed values, input validation, response shape.
// No database or web-server code in here, so it is easy to read and test.

// These values MUST match your frontend (App.jsx / ReportForm.jsx).
const CATEGORIES = [
  'roads', 'streetlights', 'garbage', 'water', 'drainage', 'transport',
  'traffic', 'electricity', 'safety', 'government', 'parks', 'other',
];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['PENDING', 'IN PROGRESS', 'RESOLVED'];

const LIMITS = { title: 100, description: 500, location: 200 };

// ---------- Validation ----------

// Required text field: must be a non-empty string within the length limit.
function readText(body, field, errors) {
  const raw = body[field];
  if (typeof raw !== 'string' || raw.trim() === '') {
    errors[field] = `${field} is required`;
    return '';
  }
  const text = raw.trim();
  if (text.length > LIMITS[field]) {
    errors[field] = `${field} must be ${LIMITS[field]} characters or fewer`;
  }
  return text;
}

// gpsCoordinates arrives as:
//  - a JSON string in multipart form data:  '{"latitude":11.01,"longitude":76.95}'
//  - a real object in a JSON request
//  - missing / "" / "null"  -> means "no GPS"
function parseGpsCoordinates(raw) {
  if (raw === undefined || raw === null || raw === '' || raw === 'null' || raw === 'undefined') {
    return { value: null };
  }

  let gps = raw;
  if (typeof raw === 'string') {
    try {
      gps = JSON.parse(raw);
    } catch {
      return { value: null, error: 'gpsCoordinates must be valid JSON like {"latitude":11.01,"longitude":76.95}' };
    }
  }
  if (gps === null) return { value: null };

  if (typeof gps !== 'object' || Array.isArray(gps)) {
    return { value: null, error: 'gpsCoordinates must be an object with latitude and longitude' };
  }

  const { latitude, longitude } = gps;
  const isNumber = (n) => typeof n === 'number' && Number.isFinite(n);
  if (!isNumber(latitude) || !isNumber(longitude)) {
    return { value: null, error: 'latitude and longitude must be numbers' };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { value: null, error: 'latitude must be -90..90 and longitude must be -180..180' };
  }
  // Keep only the two fields we expect (ignore anything extra).
  return { value: { latitude, longitude } };
}

// Checks the request body. Returns { errors, value }.
// Anything not listed here (status, supportCount, createdAt...) is IGNORED,
// so a client cannot choose its own status or fake support counts.
function validateReportInput(body) {
  const errors = {};

  const title = readText(body, 'title', errors);
  const description = readText(body, 'description', errors);
  const location = readText(body, 'location', errors);

  const category = typeof body.category === 'string' ? body.category.trim().toLowerCase() : '';
  if (!CATEGORIES.includes(category)) {
    errors.category = `category must be one of: ${CATEGORIES.join(', ')}`;
  }

  const priority = typeof body.priority === 'string' ? body.priority.trim().toLowerCase() : '';
  if (!PRIORITIES.includes(priority)) {
    errors.priority = `priority must be one of: ${PRIORITIES.join(', ')}`;
  }

  const gps = parseGpsCoordinates(body.gpsCoordinates);
  if (gps.error) errors.gpsCoordinates = gps.error;

  return {
    errors,
    value: { title, description, category, priority, location, gpsCoordinates: gps.value },
  };
}

// A MongoDB id is exactly 24 hexadecimal characters.
function isValidObjectId(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

// ---------- Response shape (what the frontend receives) ----------

// Same format your frontend already shows, e.g. "09 OCT 2026".
function formatDate(date) {
  return new Date(date)
    .toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    })
    .toUpperCase();
}

// Converts a MongoDB document into the JSON the frontend gets.
// The database stores photo as "/uploads/abc.jpg"; the API returns a full URL
// so that <img src={report.photo}> works as it does today.
function toReportResponse(doc, baseUrl) {
  let photo = null;
  if (doc.photo) {
    photo = /^https?:\/\//i.test(doc.photo) ? doc.photo : `${baseUrl}${doc.photo}`;
  }

  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    priority: doc.priority,
    location: doc.location,
    gpsCoordinates: doc.gpsCoordinates ?? null,
    photo,
    status: doc.status,
    date: formatDate(doc.createdAt),
    createdAt: new Date(doc.createdAt).toISOString(),
    supportCount: doc.supportCount ?? 0,
    comments: doc.comments ?? [],
  };
}

module.exports = {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  validateReportInput,
  parseGpsCoordinates,
  isValidObjectId,
  formatDate,
  toReportResponse,
};

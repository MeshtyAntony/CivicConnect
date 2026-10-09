// backend/server.js
// CivicConnect backend - STEP 1: skeleton
// (config, CORS for Vite, health check, safe MongoDB connection)

const path = require('path');
const fs = require('fs');

// Always load backend/.env, no matter which folder you start the server from.
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { connectionHint } = require('./utils/dbErrorHint');
const reportsRouter = require('./routes/reports');

// ---------- 1. Configuration (all from .env, nothing hardcoded) ----------
const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'civicconnect';
const CLIENT_ORIGINS = (
  process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing. Create backend/.env (copy .env.example), then run: npm run check-db');
  process.exit(1);
}
if (!process.env.ADMIN_KEY) {
  console.warn('Note: ADMIN_KEY is not set yet. It will be needed in Step 3 (admin status updates).');
}

// Folder where photos will be saved in Step 2. Created automatically if missing.
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- 2. Express app + middleware ----------
const app = express();

// Only your Vite frontend may call the API from a browser.
// (curl/Postman send no Origin header, so they are allowed for testing.)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CLIENT_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      const error = new Error(`Origin ${origin} is not allowed by CORS`);
      error.status = 403;
      return callback(error);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-admin-key'],
  })
);

app.use(express.json({ limit: '100kb' }));

// Serve uploaded photos so the frontend can use them in <img src="...">.
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    index: false,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

// ---------- 3. Routes ----------
app.get('/', (req, res) => {
  res.json({ message: 'CivicConnect backend is running!' });
});

// Health check: confirms the server is up AND the database answers.
app.get('/api/health', async (req, res) => {
  try {
    await req.app.locals.db.command({ ping: 1 });
    res.json({
      status: 'ok',
      database: 'connected',
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/reports', reportsRouter);

// ---------- 4. 404 + error handling (always JSON) ----------
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(err); // full details stay in the server console only
  }
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
  });
});

// ---------- 5. Start: connect to MongoDB first, then listen ----------
async function startServer() {
  let client;

  try {
    // A badly formatted URI can throw right here, so this line is inside the try.
    client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    const db = client.db(DB_NAME);
    await db.command({ ping: 1 });
    app.locals.db = db;
    console.log(`Connected to MongoDB (database: ${DB_NAME})`);

    // Indexes make listing/filtering fast. Safe to run on every start.
    try {
      const reports = db.collection('reports');
      await reports.createIndex({ createdAt: -1 });
      await reports.createIndex({ category: 1, status: 1 });
    } catch (indexError) {
      console.warn(`Warning: could not create indexes (${indexError.message}). The API will still work.`);
    }
  } catch (error) {
    // We print the error message and a hint - never the connection string.
    console.error('\nMongoDB connection failed.');
    console.error(`  ${error.name}${error.code ? ` (code ${error.code})` : ''}: ${error.message}\n`);
    console.error(connectionHint(error));
    if (client) await client.close().catch(() => {});
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`CivicConnect backend running at http://localhost:${PORT}`);
    console.log(`Allowed frontend origins: ${CLIENT_ORIGINS.join(', ')}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Close the other server or change PORT in .env.`);
    } else {
      console.error(error);
    }
    process.exit(1);
  });

  // Ctrl+C closes things cleanly.
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    server.close();
    await client.close().catch(() => {});
    process.exit(0);
  });
}

startServer();

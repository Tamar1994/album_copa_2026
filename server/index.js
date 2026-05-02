import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import albumRouter from './routes/album.js';
import { verifyToken } from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '15mb' }));

if (!isProd) {
  app.use(cors());
}

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/album', verifyToken, albumRouter);

// ── Serve built React app in production ──────────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${isProd ? 'production' : 'development'}]`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    // In development still start the server (API will return 503)
    if (!isProd) {
      app.listen(PORT, () => {
        console.warn(`Server started WITHOUT DB on port ${PORT} — fix MONGODB_URI`);
      });
    } else {
      process.exit(1);
    }
  });

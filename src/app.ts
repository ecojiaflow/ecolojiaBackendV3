// PATH: backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim());

const PROD = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin.includes('.netlify.app') || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    if (!PROD) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-cron-key',
    'x-api-key',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-anonymous-id',
    'x-user-id'
  ],
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------- ROUTES ----------------------

try {
  const multiCategoryRoutes = require('./routes/multiCategory.routes');
  app.use('/api/multi-category', multiCategoryRoutes);
  console.log('✅ Routes multi-catégories chargées');
} catch (err: any) {
  console.warn('⚠️ multiCategory.routes non disponible :', err.message);
}

try {
  const analyzeRoutes = require('./routes/analyze.routes');
  app.use('/api/analyze', analyzeRoutes);
} catch (err: any) {
  console.warn('⚠️ analyze.routes non disponible :', err.message);
}

// ✅ Route health corrigée
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Ecolojia backend alive',
    timestamp: Date.now()
  });
});

// Catch-all 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    available_routes: [
      '/api/products',
      '/api/analyze',
      '/api/multi-category/*',
      '/health'
    ]
  });
});

module.exports = app;

// EOF

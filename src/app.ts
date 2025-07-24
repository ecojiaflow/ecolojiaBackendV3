// PATH: backend/src/app.ts
// -----------------------------------------------------------------------------
//  ECOLOJIA – Configuration dʼExpress (version complète corrigée)
//  Ce fichier expose désormais les routes IA (/api/ai) tout en conservant :
//  • Auth + validation email + rate‑limit
//  • Routes produits / scan / cosmetic / detergent / admin
//  • Sécurité CORS / Helmet
// -----------------------------------------------------------------------------

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

// ───────────────────────────────  ROUTES  ────────────────────────────────────
import productRoutes from './routes/product.routes';
import scanRoutes from './routes/scan.routes';
import cosmeticRoutes from './routes/cosmetic.routes';
import detergentRoutes from './routes/detergent.routes';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth';
import emailValidationRoutes from './routes/emailValidation';
import aiRoutes from './routes/ai.routes';          // ✅ NOUVELLE ROUTE IA

// ─────────────────────────────  INITIALISATION  ──────────────────────────────
dotenv.config();
const app = express();

// ───────────────────────────────  MIDDLEWARES  ───────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Trop de tentatives depuis cette IP, réessayez dans 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(cors({
  origin:
    process.env.NODE_ENV === 'production'
      ? [
          'https://ecolojia-v3.netlify.app',
          'https://ecolojia-backend-working.onrender.com'
        ]
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    }
  })
);

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ────────────────────────────────  ROUTES  ───────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'ECOLOJIA – Assistant IA',
    version: '2.1.1',
    status: 'operational',
    description: 'Plateforme scientifique multi‑catégories pour une consommation responsable',
    endpoints: {
      health: '/api/health',
      auth: {
        health: 'GET /api/auth/health',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      emailValidation: {
        verify: 'POST /api/email-validation/verify',
        resend: 'POST /api/email-validation/resend',
        status: 'GET /api/email-validation/status/:email'
      },
      products: {
        analyze: 'POST /api/products/analyze',
        status: 'GET /api/products/status'
      },
      scan: 'POST /api/scan/barcode',
      cosmetic: 'POST /api/cosmetic/analyze',
      detergent: 'POST /api/detergent/analyze',
      ai: {
        analyze: 'POST /api/ai/analyze'
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard'
      }
    }
  });
});

// HEALTH
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AUTH & EMAIL
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/email-validation', authLimiter, emailValidationRoutes);

// ANALYSES PRODUITS
app.use('/api/products', productRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/cosmetic', cosmeticRoutes);
app.use('/api/detergent', detergentRoutes);
app.use('/api/ai', aiRoutes);               // ✅ ROUTES IA EXPOSÉES

// ADMIN
app.use('/api/admin', adminRoutes);

// 404 – catch‑all
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    message: `L'endpoint ${req.originalUrl} n'existe pas sur le serveur ECOLOJIA`,
    suggestion: 'Consultez GET / pour la liste complète des endpoints',
    timestamp: new Date().toISOString()
  });
});

// ERROR HANDLER
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Erreur serveur non gérée:', err);
  res.status(err.status || 500).json({
    success: false,
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'production' ? 'Erreur interne' : err.message,
    timestamp: new Date().toISOString()
  });
});

export default app;
// EOF
// PATH: backend/src/app.ts
// REMPLACEZ ENTIÈREMENT VOTRE FICHIER app.ts PAR CE CODE

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Routes existantes (gardez vos imports existants)
import productRoutes from './routes/product.routes';
import scanRoutes from './routes/scan.routes';
import cosmeticRoutes from './routes/cosmetic.routes';
import detergentRoutes from './routes/detergent.routes';
import adminRoutes from './routes/admin.routes';

// 🆕 NOUVELLES ROUTES AUTH (ajout)
import authRoutes from './routes/auth';
import emailValidationRoutes from './routes/emailValidation';

dotenv.config();

const app = express();

// 🆕 Rate limiting pour routes sensibles
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max pour auth
  message: {
    success: false,
    message: 'Trop de tentatives depuis cette IP, réessayez dans 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares existants améliorés
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ecolojia-v3.netlify.app', 'https://ecolojia-backend-working.onrender.com'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ ROUTE RACINE MISE À JOUR AVEC AUTH
app.get('/', (req, res) => {
 res.json({
   name: 'ECOLOJIA - Assistant IA Révolutionnaire',
   version: '2.1.0', // 🔄 VERSION MISE À JOUR
   status: 'operational',
   description: 'Premier assistant IA scientifique multi-catégories pour consommation responsable',
   features: [
     '🔬 Classification NOVA automatique',
     '📱 Scanner codes-barres universels',
     '💄 Analyse cosmétiques INCI',
     '🧽 Impact environnemental détergents',
     '🔍 Recherche OpenFoodFacts',
     '🎯 Détection automatique catégories',
     '📊 Sources scientifiques INSERM/EFSA 2024',
     '⚙️ Interface admin monitoring imports',
     '🔐 Authentification JWT avec validation email', // 🆕 NOUVEAU
     '📧 Système email validation sécurisé', // 🆕 NOUVEAU
     '👤 Gestion utilisateurs et quotas', // 🆕 NOUVEAU
     '🛡️ Sécurité renforcée avec rate limiting' // 🆕 NOUVEAU
   ],
   endpoints: {
     health: '/api/health',
     // Endpoints existants
     scanner: 'POST /api/scan/barcode',
     cosmetic: 'POST /api/cosmetic/analyze',
     detergent: 'POST /api/detergent/analyze',
     products: {
       analyze: 'POST /api/products/analyze',
       status: 'GET /api/products/status'
     },
     admin: {
       dashboard: 'GET /api/admin/dashboard',
       recent_products: 'GET /api/admin/recent-products',
       import_logs: 'GET /api/admin/import-logs',
       trigger_import: 'POST /api/admin/trigger-import'
     },
     // 🆕 NOUVEAUX ENDPOINTS AUTH
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
     }
   },
   security: {
     rateLimit: 'Active (10 req/15min pour auth)',
     cors: 'Configuré pour production/dev',
     helmet: 'Sécurité headers activée',
     jwt: 'JWT tokens pour authentification'
   },
   documentation: 'https://docs.ecolojia.com',
   contact: 'contact@ecolojia.com',
   timestamp: new Date().toISOString()
 });
});

// 🔧 HEALTH CHECK AMÉLIORÉ
app.get('/api/health', async (_req, res) => {
 try {
   const healthData = {
     status: 'ok', 
     message: 'Ecolojia backend API running with scanner + multi-category analysis + admin monitoring + auth system.',
     timestamp: new Date().toISOString(),
     uptime: process.uptime(),
     environment: process.env.NODE_ENV || 'development',
     version: '2.1.0',
     services: {
       scanner: 'active',
       cosmetic_analyzer: 'active',
       detergent_analyzer: 'active',
       openfoodfacts: 'active',
       admin_dashboard: 'active',
       import_monitoring: 'active',
       authentication: 'active', // 🆕 NOUVEAU
       email_validation: 'active', // 🆕 NOUVEAU
       database: 'connected' // 🆕 NOUVEAU
     }
   };

   res.status(200).json(healthData);

 } catch (error: any) {
   console.error('❌ Health check error:', error);
   res.status(500).json({
     status: 'error',
     message: 'Health check failed',
     timestamp: new Date().toISOString(),
     error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
   });
 }
});

// 🆕 NOUVELLES ROUTES AUTH (ajout AVANT les routes existantes)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/email-validation', authLimiter, emailValidationRoutes);

// Routes existantes (ordre préservé - ne pas toucher)
app.use('/api/products', productRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/cosmetic', cosmeticRoutes);
app.use('/api/detergent', detergentRoutes);
app.use('/api/admin', adminRoutes);

// ✅ ROUTE 404 MISE À JOUR AVEC TOUS LES ENDPOINTS
app.use('*', (req, res) => {
 res.status(404).json({
   success: false,
   error: 'Route non trouvée',
   message: `L'endpoint ${req.originalUrl} n'existe pas sur le serveur ECOLOJIA`,
   availableEndpoints: {
     general: [
       'GET /',
       'GET /api/health'
     ],
     // 🆕 Nouveaux endpoints auth
     auth: [
       'GET /api/auth/health',
       'POST /api/auth/register',
       'POST /api/auth/login',
       'GET /api/auth/me (JWT required)',
       'POST /api/auth/logout'
     ],
     emailValidation: [
       'POST /api/email-validation/verify',
       'POST /api/email-validation/resend',
       'GET /api/email-validation/status/:email'
     ],
     // Endpoints existants
     analysis: [
       'POST /api/scan/barcode',
       'POST /api/cosmetic/analyze',
       'POST /api/detergent/analyze',
       'POST /api/products/analyze',
       'GET /api/products/status'
     ],
     admin: [
       'GET /api/admin/dashboard',
       'GET /api/admin/recent-products',
       'GET /api/admin/import-logs',
       'POST /api/admin/trigger-import'
     ]
   },
   suggestion: `Consultez GET / pour la documentation complète des endpoints disponibles.`,
   timestamp: new Date().toISOString()
 });
});

// 🆕 ERROR HANDLING MIDDLEWARE GLOBAL
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled Server Error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'production' 
      ? 'Une erreur interne est survenue. Veuillez réessayer.' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

export default app;
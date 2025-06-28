import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import productRoutes from './routes/product.routes';
import healthRouter from './routes/health.routes';
import partnerRoutes from './routes/partner.routes';
import ecoScoreRoutes from './routes/eco-score.routes';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';

dotenv.config();

const app: Application = express();

// ✅ CORS CONFIGURATION - Utiliser CORS_ORIGIN avec trim pour nettoyer les espaces
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://ecolojiafrontv3.netlify.app',
  'https://main--ecolojiafrontv3.netlify.app'
];

// Debug: Log de la variable d'environnement
console.log('🔍 CORS_ORIGIN env:', process.env.CORS_ORIGIN);
console.log('🔍 Allowed origins après parsing:', allowedOrigins);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Autoriser les requêtes sans origin (Postman, mobile apps)
    if (!origin) {
      console.log('✅ Requête sans origin autorisée');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Origin autorisée:', origin);
      callback(null, true);
    } else {
      console.log('❌ Origin refusée:', origin);
      console.log('❌ Origins autorisées:', allowedOrigins);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-key', 'x-api-key']
};

// ✅ MIDDLEWARES
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

// ✅ ROUTES API
app.use('/api', productRoutes);
app.use('/api', partnerRoutes);
app.use('/api/eco-score', ecoScoreRoutes);
app.use('/', healthRouter);

// ✅ SWAGGER DOCS
const swaggerUrl = process.env.NODE_ENV === 'production' 
  ? `https://ecolojiabackendv3.onrender.com/api-docs`
  : `http://localhost:${process.env.PORT || 3000}/api-docs`;
  
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log('📘 Swagger docs:', swaggerUrl);

// ✅ LOGS
console.log('✅ Routes de tracking partenaire activées');
console.log('✅ Routes de score écologique IA activées');
console.log('✅ CORS configuré pour:', allowedOrigins);
console.log('✅ Base de données:', process.env.DATABASE_URL ? 'connectée' : 'non configurée');

// ✅ ROOT INFO
app.get('/', (_req, res) => {
  res.json({
    message: 'Ecolojia API',
    version: '1.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    cors_origins: allowedOrigins,
    endpoints: [
      'GET /api/products',
      'GET /api/products/search',
      'GET /api/products/stats',
      'GET /api/products/:slug',
      'GET /api/products/:id/similar',
      'POST /api/products',
      'PUT /api/products/:id',
      'DELETE /api/products/:id',
      'GET /api/track/:id',
      'POST /api/eco-score/calculate',
      'POST /api/eco-score/update/:productId',
      'POST /api/eco-score/update-all',
      'GET /api/eco-score/stats',
      'GET /api/eco-score/test',
      'GET /health',
      'GET /api-docs'
    ],
    timestamp: new Date().toISOString()
  });
});

export default app;
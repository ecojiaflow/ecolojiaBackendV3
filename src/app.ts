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

// ✅ CORS PERMISSIF TEMPORAIRE - FIX URGENCE
const corsOptions = {
  origin: '*', // PERMISSIF TOTAL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-key', 'x-api-key']
};

console.log('🚨 CORS PERMISSIF ACTIVÉ: origin: *');

// ✅ MIDDLEWARES
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

// ✅ ROUTES API
app.use('/api', productRoutes);
app.use('/api', partnerRoutes);
app.use('/api/eco-score', ecoScoreRoutes);
app.use('/', healthRouter);
app.use('/api', healthRouter);

// ✅ SWAGGER DOCS
const swaggerUrl = process.env.NODE_ENV === 'production' 
  ? `https://ecolojiabackendv3.onrender.com/api-docs`
  : `http://localhost:${process.env.PORT || 3000}/api-docs`;
  
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log('📘 Swagger docs:', swaggerUrl);

// ✅ LOGS
console.log('✅ Routes de tracking partenaire activées');
console.log('✅ Routes de score écologique IA activées');
console.log('✅ CORS configuré pour: PERMISSIF (*)');
console.log('✅ Base de données:', process.env.DATABASE_URL ? 'connectée' : 'non configurée');

// ✅ ROOT INFO
app.get('/', (_req, res) => {
  res.json({
    message: 'Ecolojia API',
    version: '1.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    cors_status: 'PERMISSIF (*)',
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
      'GET /api/health',
      'GET /api-docs'
    ],
    timestamp: new Date().toISOString()
  });
});

export default app;
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

// ✅ CORS SIMPLE ET FONCTIONNEL - SUPPRESSION DE LA LOGIQUE DÉFECTUEUSE
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-key, x-api-key, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

console.log('🚨 CORS MANUEL SIMPLE ACTIVÉ');

// ✅ MIDDLEWARES
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
console.log('✅ CORS configuré pour: MANUEL SIMPLE');
console.log('✅ Base de données:', process.env.DATABASE_URL ? 'connectée' : 'non configurée');

// ✅ ROOT INFO
app.get('/', (_req, res) => {
  res.json({
    message: 'Ecolojia API',
    version: '1.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    cors_status: 'MANUEL SIMPLE',
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
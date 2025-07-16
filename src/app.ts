// PATH: backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import productRoutes from './routes/product.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ ROUTE RACINE AJOUTÉE
app.get('/', (req, res) => {
  res.json({
    name: 'ECOLOJIA - Assistant IA Révolutionnaire',
    version: '1.0.0',
    status: 'operational',
    description: 'Premier assistant IA scientifique pour consommation responsable',
    features: [
      'Classification NOVA automatique',
      'Détection ultra-transformation',
      'Alternatives naturelles',
      'Sources scientifiques INSERM/EFSA 2024'
    ],
    endpoints: {
      health: '/api/health',
      products: {
        analyze: 'POST /api/products/analyze',
        status: 'GET /api/products/status'
      }
    },
    documentation: 'https://docs.ecolojia.com',
    contact: 'contact@ecolojia.com',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Ecolojia backend API running.',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/products', productRoutes);

// ✅ ROUTE 404 POUR ENDPOINTS INEXISTANTS
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: `L'endpoint ${req.originalUrl} n'existe pas`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/products/analyze',
      'GET /api/products/status'
    ],
    timestamp: new Date().toISOString()
  });
});

export default app;
// EOF
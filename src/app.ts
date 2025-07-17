// PATH: backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import productRoutes from './routes/product.routes';
import scanRoutes from './routes/scan.routes';
import cosmeticRoutes from './routes/cosmetic.routes';
import detergentRoutes from './routes/detergent.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ ROUTE RACINE MISE À JOUR
app.get('/', (req, res) => {
 res.json({
   name: 'ECOLOJIA - Assistant IA Révolutionnaire',
   version: '2.0.0',
   status: 'operational',
   description: 'Premier assistant IA scientifique multi-catégories pour consommation responsable',
   features: [
     '🔬 Classification NOVA automatique',
     '📱 Scanner codes-barres universels',
     '💄 Analyse cosmétiques INCI',
     '🧽 Impact environnemental détergents',
     '🔍 Recherche OpenFoodFacts',
     '🎯 Détection automatique catégories',
     '📊 Sources scientifiques INSERM/EFSA 2024'
   ],
   endpoints: {
     health: '/api/health',
     scanner: 'POST /api/scan/barcode',
     cosmetic: 'POST /api/cosmetic/analyze',
     detergent: 'POST /api/detergent/analyze',
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
   message: 'Ecolojia backend API running with scanner + multi-category analysis.',
   timestamp: new Date().toISOString(),
   uptime: process.uptime(),
   services: {
     scanner: 'active',
     cosmetic_analyzer: 'active',
     detergent_analyzer: 'active',
     openfoodfacts: 'active'
   }
 });
});

// Routes existantes
app.use('/api/products', productRoutes);

// Nouvelles routes
app.use('/api/scan', scanRoutes);
app.use('/api/cosmetic', cosmeticRoutes);
app.use('/api/detergent', detergentRoutes);

// ✅ ROUTE 404 MISE À JOUR
app.use('*', (req, res) => {
 res.status(404).json({
   error: 'Route non trouvée',
   message: `L'endpoint ${req.originalUrl} n'existe pas`,
   availableEndpoints: [
     'GET /',
     'GET /api/health',
     'POST /api/scan/barcode',
     'POST /api/cosmetic/analyze',
     'POST /api/detergent/analyze',
     'POST /api/products/analyze',
     'GET /api/products/status'
   ],
   timestamp: new Date().toISOString()
 });
});

export default app;
// EOF
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// CORS SÉCURISÉ
const allowedOrigins = [
  'https://frontendv3.netlify.app',
  'https://ecolojiafrontv3.netlify.app',
  'https://main--frontendv3.netlify.app',
  'https://main--ecolojiafrontv3.netlify.app',
  'https://ecolojia-backend-working.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('.netlify.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-key', 'x-api-key', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// IMPORT DES ROUTES TYPESCRIPT/PRISMA
const productRoutes = require('./routes/product.routes');
const healthRoutes = require('./routes/health.routes');

// ROUTES API
app.use('/api/products', productRoutes);
app.use('/api', healthRoutes);

// ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    message: 'Ecolojia API - OCR Intelligent Activé',
    version: '2.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    features: {
      ocr_google_vision: '✅ Actif',
      multi_photo_analysis: '✅ Actif',
      intelligent_extraction: '✅ Actif',
      eco_score_calculation: '✅ Actif',
      prisma_database: '✅ Actif'
    },
    endpoints: {
      products: [
        'GET /api/products ✅',
        'GET /api/products/search ✅', 
        'GET /api/products/:slug ✅',
        'GET /api/products/barcode/:code ✅',
        'POST /api/products/analyze-photos ✅ OCR INTELLIGENT'
      ],
      health: ['GET /health ✅', 'GET /api/health ✅']
    }
  });
});

// HEALTH CHECKS
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ocr_status: 'intelligent_active',
    database: 'prisma_postgresql'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ocr_status: 'intelligent_active',
    database: 'prisma_postgresql'
  });
});

// ERROR HANDLER
app.use((error, req, res, next) => {
  console.error('❌ Erreur serveur:', error);
  res.status(500).json({
    error: 'Erreur serveur interne',
    message: error.message
  });
});

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    requested: req.originalUrl,
    available_routes: ['/api/products', '/api/health', '/health']
  });
});

// DÉMARRAGE SERVEUR
app.listen(PORT, HOST, () => {
  console.log(`🌱 Serveur Ecolojia OCR INTELLIGENT démarré sur http://${HOST}:${PORT}`);
  console.log(`🌐 Accessible via: https://ecolojia-backend-working.onrender.com`);
  console.log(`🧠 OCR Google Vision: ACTIF`);
  console.log(`📸 Analyse multi-photos: ACTIF`);
  console.log(`🎯 Extraction intelligente: ACTIF`);
  console.log(`📋 Routes disponibles:`);
  console.log(`   GET /health`);
  console.log(`   GET /api/health`);
  console.log(`   GET /api/products`);
  console.log(`   POST /api/products/analyze-photos (OCR INTELLIGENT)`);
});
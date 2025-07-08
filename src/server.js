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

// IMPORT DES ROUTES avec try/catch pour debugging
let productRoutes, healthRoutes;

try {
  // Essayer d'importer les routes TypeScript compilées ou JS
  productRoutes = require('./routes/product.routes.js');
} catch (error) {
  try {
    productRoutes = require('./routes/product.routes.ts');
  } catch (error2) {
    try {
      productRoutes = require('./routes/product.routes');
    } catch (error3) {
      console.error('❌ Impossible d\'importer product.routes:', error3.message);
      // Route de fallback
      productRoutes = express.Router();
      productRoutes.post('/analyze-photos', (req, res) => {
        res.status(503).json({
          success: false,
          error: 'Service temporairement indisponible',
          message: 'Routes TypeScript non compilées'
        });
      });
    }
  }
}

try {
  healthRoutes = require('./routes/health.routes.js');
} catch (error) {
  try {
    healthRoutes = require('./routes/health.routes.ts');
  } catch (error2) {
    try {
      healthRoutes = require('./routes/health.routes');
    } catch (error3) {
      console.error('❌ Impossible d\'importer health.routes:', error3.message);
      // Route de fallback
      healthRoutes = express.Router();
      healthRoutes.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });
    }
  }
}

// ROUTES API
app.use('/api/products', productRoutes);
app.use('/api', healthRoutes);

// ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    message: 'Ecolojia API - Débogage Routes',
    version: '2.0.1',
    status: 'operational',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    debug: {
      routes_loaded: {
        product_routes: productRoutes ? 'loaded' : 'failed',
        health_routes: healthRoutes ? 'loaded' : 'failed'
      },
      node_version: process.version,
      working_directory: process.cwd()
    },
    endpoints: {
      available: [
        'GET /health ✅',
        'GET /api/health ✅',
        'POST /api/products/analyze-photos ⚠️ (peut être indisponible)'
      ]
    }
  });
});

// HEALTH CHECKS
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    routes_status: {
      product_routes: productRoutes ? 'loaded' : 'failed',
      health_routes: healthRoutes ? 'loaded' : 'failed'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    routes_status: {
      product_routes: productRoutes ? 'loaded' : 'failed',
      health_routes: healthRoutes ? 'loaded' : 'failed'
    }
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
  console.log(`🌱 Serveur Ecolojia (mode débogage) démarré sur http://${HOST}:${PORT}`);
  console.log(`🌐 Accessible via: https://ecolojia-backend-working.onrender.com`);
  console.log(`🔍 Routes chargées:`);
  console.log(`   Product routes: ${productRoutes ? '✅' : '❌'}`);
  console.log(`   Health routes: ${healthRoutes ? '✅' : '❌'}`);
  console.log(`📋 Routes disponibles:`);
  console.log(`   GET /health`);
  console.log(`   GET /api/health`);
  console.log(`   POST /api/products/analyze-photos`);
});
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

const productRoutes = require('./routes/product.routes');
const healthRouter = require('./routes/health.routes');
const partnerRoutes = require('./routes/partner.routes');
const ecoScoreRoutes = require('./routes/eco-score.routes');

const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/swagger');

dotenv.config();

const app = express();

// ✅ CORS ÉLARGI POUR TOUS LES DOMAINES NETLIFY
const allowedOrigins = [
  'https://frontendv3.netlify.app',
  'https://ecolojiafrontv3.netlify.app',
  'https://main--frontendv3.netlify.app',
  'https://main--ecolojiafrontv3.netlify.app',
  'https://ecolojiabackendv3.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173'
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('🔍 Origin demandée:', origin);
    
    if (!origin) {
      console.log('✅ Requête sans origin autorisée');
      return callback(null, true);
    }
    
    if (origin.includes('.netlify.app')) {
      console.log('✅ Domaine Netlify autorisé:', origin);
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Origin autorisée explicitement:', origin);
      callback(null, true);
    } else {
      console.log('🚨 Origin bloquée:', origin);
      console.log('📋 Origins autorisées:', allowedOrigins);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
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
    'Origin'
  ]
}));

console.log('✅ CORS configuré pour:', allowedOrigins);

// ✅ MIDDLEWARES
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 🧪 ROUTES DE TEST DIRECTES
app.get('/api/test-barcode', (req, res) => {
  res.json({ 
    success: true,
    message: 'Route barcode test fonctionne !', 
    timestamp: new Date().toISOString(),
    source: 'direct-app-js',
    note: 'Route de test JavaScript'
  });
});

app.get('/api/products/barcode-direct/:code', (req, res) => {
  const { code } = req.params;
  
  if (!code || code.trim() === '') {
    return res.status(400).json({
      success: false,
      error: "Code-barres requis",
      barcode: code
    });
  }

  const cleanBarcode = code.trim().replace(/[^\d]/g, '');
  
  if (cleanBarcode.length < 8) {
    return res.status(400).json({
      success: false,
      error: "Code-barres invalide (minimum 8 chiffres)",
      barcode: code
    });
  }

  console.log(`🔍 [DIRECT] Recherche produit par code-barres: ${cleanBarcode}`);
  
  res.json({
    success: false,
    error: "Produit non trouvé dans notre base de données",
    barcode: cleanBarcode,
    suggestion_url: `/product-not-found?barcode=${cleanBarcode}`,
    message: "Aidez-nous à enrichir notre base en photographiant ce produit",
    source: 'direct-app-js-barcode-route',
    timestamp: new Date().toISOString()
  });
});

// ✅ ROUTES API
app.use('/api/products', productRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/eco-score', ecoScoreRoutes);
app.use('/', healthRouter);
app.use('/api', healthRouter);

// ✅ SWAGGER DOCS
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ ROOT INFO ENDPOINT
app.get('/', (req, res) => {
  res.json({
    message: 'Ecolojia API',
    version: '1.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      products: [
        'GET /api/products',
        'GET /api/products/search',
        'GET /api/products/stats',
        'GET /api/products/:slug',
        'GET /api/products/:id/similar',
        'GET /api/products/barcode/:code',
        'POST /api/products',
        'POST /api/products/analyze-photos',
        'PUT /api/products/:id',
        'DELETE /api/products/:id'
      ],
      test: [
        'GET /api/test-barcode',
        'GET /api/products/barcode-direct/:code'
      ],
      tracking: [
        'GET /api/partners/track/:id'
      ],
      ai: [
        'POST /api/eco-score/calculate',
        'POST /api/eco-score/update/:productId',
        'POST /api/eco-score/update-all',
        'GET /api/eco-score/stats',
        'GET /api/eco-score/test'
      ],
      health: [
        'GET /health',
        'GET /api/health'
      ],
      docs: [
        'GET /api-docs'
      ]
    }
  });
});

module.exports = app;
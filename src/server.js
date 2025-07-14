const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const visionOCR = require('./services/ocr/visionOCR');
const analyzeRoutes = require('./routes/analyze.routes');
const analyzeDevRoutes = require('./routes/analyzeDev.routes');
const chatRoutes = require('./routes/chat.routes');

// ➕ NOUVEAU : Import du système quota
const userRoutes = require('./routes/user.routes');

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

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
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-cron-key', 
    'x-api-key', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'x-anonymous-id'
  ]
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==============================
// ✅ ROUTES MULTI-CATÉGORIES
// ==============================

try {
  const multiCategoryRoutes = require('./routes/multiCategory.routes');
  app.use('/api/multi-category', multiCategoryRoutes);
  console.log('✅ Routes multi-catégories chargées');
} catch (err) {
  console.warn('⚠️ multiCategory.routes.js non disponible :', err.message);
}

// ==============================
// ➕ ROUTES QUOTA UTILISATEUR
// ==============================

const { checkAnalysisQuota, checkChatQuota } = require('./routes/user.routes');
app.use('/api/user', userRoutes);

// ==============================
// 🔄 ROUTES PRODUITS (OCR, GET)
// ==============================

const productRoutes = express.Router();

productRoutes.post('/analyze-photos', checkAnalysisQuota, async (req, res) => {
  try {
    const { barcode, photos } = req.body;

    if (!barcode || !photos || !photos.front || !photos.ingredients || !photos.nutrition) {
      return res.status(400).json({ success: false, error: 'Photos ou code-barres manquants' });
    }

    console.log('📥 Reçu pour analyse IA OCR :', barcode);
    const result = await visionOCR.analyzeMultipleImages(photos);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'Erreur OCR' });
    }

    const slug = `produit-eco-${Date.now()}`;
    const redirect_url = `/product/${slug}`;

    res.json({
      success: true,
      message: 'Produit analysé avec succès via OCR IA',
      productSlug: slug,
      redirect_url,
      analyzedData: result,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Erreur analyse OCR:', err);
    res.status(500).json({ success: false, error: 'Erreur interne OCR' });
  }
});

productRoutes.get('/', (req, res) => {
  res.json([
    {
      id: "fallback_1",
      title: "Produit Éco Fallback",
      slug: "produit-eco-fallback",
      description: "Service en mode fallback",
      brand: "EcoFallback",
      category: "test",
      eco_score: 0.75,
      confidence_pct: 100,
      verified_status: "fallback",
      tags: ["fallback"],
      zones_dispo: ["FR"],
      image_url: null,
      prices: { default: 0 }
    }
  ]);
});

productRoutes.get('/search', (req, res) => {
  res.json({ 
    products: [], 
    count: 0, 
    query: req.query.q || '',
    source: 'fallback'
  });
});

productRoutes.get('/barcode/:code', (req, res) => {
  const { code } = req.params;
  res.status(404).json({
    success: false,
    error: "Produit non trouvé dans notre base de données (mode fallback)",
    barcode: code,
    suggestion_url: `/product-not-found?barcode=${code}`,
    message: "Service temporairement en mode fallback"
  });
});

productRoutes.get('/:slug', (req, res) => {
  const { slug } = req.params;

  const mockProduct = {
    id: "fallback_" + Date.now(),
    title: "Produit Éco Analysé (Fallback)",
    slug: slug,
    description: "Ce produit a été analysé. OCR IA en cours d'intégration complète.",
    brand: "EcoFallback",
    category: "alimentaire",
    eco_score: 0.75,
    ai_confidence: 0.8,
    confidence_pct: 80,
    confidence_color: "green",
    verified_status: "fallback",
    tags: ["fallback"],
    images: [],
    zones_dispo: ["FR"],
    prices: { default: 0 },
    resume_fr: "Produit analysé via OCR IA (beta)",
    enriched_at: new Date().toISOString()
  };

  console.log(`✅ Retour produit mock pour slug: ${slug}`);
  res.json(mockProduct);
});

// ==============================
// 🔄 ROUTES ANALYSE + CHAT QUOTA
// ==============================

const addQuotaToAnalyzeRoutes = (router) => {
  const express = require('express');
  const newRouter = express.Router();
  router.stack.forEach(layer => {
    if (layer.route) {
      const { path, methods } = layer.route;
      if (methods.post) {
        newRouter.post(path, checkAnalysisQuota, ...layer.route.stack.map(s => s.handle));
      } else {
        Object.keys(methods).forEach(method => {
          if (method !== 'post') {
            newRouter[method](path, ...layer.route.stack.map(s => s.handle));
          }
        });
      }
    }
  });
  return newRouter;
};

const addQuotaToChatRoutes = (router) => {
  const express = require('express');
  const newRouter = express.Router();
  router.stack.forEach(layer => {
    if (layer.route) {
      const { path, methods } = layer.route;
      if (methods.post) {
        newRouter.post(path, checkChatQuota, ...layer.route.stack.map(s => s.handle));
      } else {
        Object.keys(methods).forEach(method => {
          if (method !== 'post') {
            newRouter[method](path, ...layer.route.stack.map(s => s.handle));
          }
        });
      }
    }
  });
  return newRouter;
};

// ==============================
// 📡 ROUTES API
// ==============================

app.use('/api/products', productRoutes);
app.use('/api/analyze', addQuotaToAnalyzeRoutes(analyzeRoutes));
app.use('/api/analyze', addQuotaToAnalyzeRoutes(analyzeDevRoutes));
app.use('/api/chat', addQuotaToChatRoutes(chatRoutes));

// ==============================
// 🏥 SANTÉ DU SYSTÈME
// ==============================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'ocr-intelligent',
    nova_scoring: 'active',
    efsa_additives: 'active',
    quota_system: 'active'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Ecolojia API - Assistant IA Scientifique Révolutionnaire',
    version: '3.1.0-quota-integrated',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// ==============================
// 🚨 GESTION DES ERREURS
// ==============================

app.use((error, req, res, next) => {
  console.error('❌ Erreur serveur:', error);
  if (error.message.includes('QUOTA_EXCEEDED')) {
    return res.status(429).json({
      error: 'Quota quotidien épuisé',
      message: error.message,
      retry_after: '24h'
    });
  }
  res.status(500).json({
    error: 'Erreur serveur interne',
    message: error.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    requested: req.originalUrl,
    available_endpoints: [
      'GET /api/user/quota',
      'POST /api/products/analyze-photos',
      'POST /api/analyze/food',
      'POST /api/analyze/dev',
      'GET /api/analyze/health',
      'POST /api/chat/message',
      'POST /api/chat/quick/:questionType',
      'GET /api/chat/suggestions/:category',
      'POST /api/chat/context/alternatives',
      'POST /api/chat/context/insights',
      'GET /api/chat/health',
      'GET /api/products',
      'GET /health'
    ]
  });
});

// ==============================
// 🚀 LANCEMENT SERVEUR
// ==============================

app.listen(PORT, HOST, () => {
  console.log(`🌱 Serveur Ecolojia (IA Assistant Révolutionnaire) sur http://${HOST}:${PORT}`);
  console.log(`🔬 Classification NOVA active`);
  console.log(`🧪 Base additifs EFSA active`);
  console.log(`📷 OCR Google Vision active`);
  console.log(`🤖 Assistant IA Sprint 3 ACTIF`);
  console.log(`💡 Alternatives automatiques ACTIVES`);
  console.log(`📚 Insights scientifiques ACTIFS`);
  console.log(`💬 Chat IA conversationnel ACTIF`);
  console.log(`📊 Système de quota INTÉGRÉ`);
  console.log(`✅ Endpoint /api/user/quota DISPONIBLE`);
});

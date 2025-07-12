const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const visionOCR = require('./services/ocr/visionOCR');
const analyzeRoutes = require('./routes/analyze.routes');

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// CORS sécurisé
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

// --- ROUTES PRODUITS --- //
const productRoutes = express.Router();

// ✅ Route OCR IA réelle
productRoutes.post('/analyze-photos', async (req, res) => {
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

// --- AUTRES ROUTES FAKE (fallback) TEMPORAIRES --- //
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

// --- ROUTES SYSTÈME --- //
const healthRoutes = express.Router();
healthRoutes.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'ocr-intelligent',
    nova_scoring: 'active',
    efsa_additives: 'active'
  });
});

app.use('/api/products', productRoutes);
app.use('/api', healthRoutes);
app.use('/api/analyze', analyzeRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Ecolojia API - OCR intelligent + NOVA/EFSA actif',
    version: '2.2.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    features: {
      'OCR Google Vision': 'active',
      'Classification NOVA': 'active',
      'Additifs EFSA': 'active'
    },
    endpoints: {
      'POST /api/products/analyze-photos': 'OCR IA Google Vision',
      'POST /api/analyze/food': 'Classification NOVA + Additifs EFSA',
      'GET /api/analyze/health': 'Status scoring scientifique',
      'GET /api/products': 'fallback mock',
      'GET /api/products/:slug': 'fallback mock',
    }
  });
});

// --- ERREURS --- //
app.use((error, req, res, next) => {
  console.error('❌ Erreur serveur:', error);
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
      'POST /api/products/analyze-photos',
      'POST /api/analyze/food',
      'GET /api/analyze/health',
      'GET /api/products',
      'GET /health'
    ]
  });
});

app.listen(PORT, HOST, () => {
  console.log(`🌱 Serveur Ecolojia (OCR IA + NOVA/EFSA) sur http://${HOST}:${PORT}`);
  console.log(`🔬 Classification NOVA active`);
  console.log(`🧪 Base additifs EFSA active`);
  console.log(`📷 OCR Google Vision active`);
});
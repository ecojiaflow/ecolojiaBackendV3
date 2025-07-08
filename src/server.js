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

// ROUTES DE FALLBACK DIRECTES (sans import externe)
const productRoutes = express.Router();
const healthRoutes = express.Router();

// Route analyze-photos de fallback
productRoutes.post('/analyze-photos', (req, res) => {
  res.json({
    success: true,
    message: 'Produit analysé et créé avec succès - MODE FALLBACK',
    productName: 'Produit Éco Analysé (Fallback)',
    ecoScore: 75,
    redirect_url: `/product/produit-eco-${Date.now()}`,
    timestamp: new Date().toISOString(),
    note: 'Mode fallback - OCR temporairement désactivé'
  });
});

// Routes produits de base
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
  
  // En mode fallback, créer un produit factice pour tous les slugs
  const mockProduct = {
    id: "fallback_" + Date.now(),
    title: "Produit Éco Analysé (Fallback)",
    slug: slug,
    description: "Ce produit a été analysé en mode fallback. Service OCR temporairement indisponible.",
    brand: "EcoFallback",
    category: "alimentaire",
    eco_score: 0.75,
    ai_confidence: 0.8,
    confidence_pct: 80,
    confidence_color: "green",
    verified_status: "fallback",
    tags: ["fallback", "mode-dégradé"],
    images: [],
    zones_dispo: ["FR"],
    prices: { default: 0 },
    resume_fr: "Produit analysé en mode fallback. L'OCR intelligent sera bientôt réactivé.",
    enriched_at: new Date().toISOString()
  };
  
  console.log(`✅ Retour produit fallback pour slug: ${slug}`);
  res.json(mockProduct);
});

// Routes health
healthRoutes.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'fallback'
  });
});

// ROUTES API
app.use('/api/products', productRoutes);
app.use('/api', healthRoutes);

// ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    message: 'Ecolojia API - Mode Fallback Actif',
    version: '2.0.2',
    status: 'operational_fallback',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    warning: 'Service en mode fallback - OCR TypeScript désactivé temporairement',
    endpoints: {
      available: [
        'GET /health ✅',
        'GET /api/health ✅',
        'GET /api/products ✅ (fallback)',
        'POST /api/products/analyze-photos ✅ (fallback)'
      ]
    },
    next_steps: 'Compilation TypeScript nécessaire pour OCR complet'
  });
});

// HEALTH CHECKS
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'fallback'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'fallback'
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
  console.log(`🌱 Serveur Ecolojia (MODE FALLBACK) démarré sur http://${HOST}:${PORT}`);
  console.log(`🌐 Accessible via: https://ecolojia-backend-working.onrender.com`);
  console.log(`⚠️ Mode fallback activé - OCR TypeScript désactivé`);
  console.log(`📋 Routes disponibles:`);
  console.log(`   GET /health ✅`);
  console.log(`   GET /api/health ✅`);
  console.log(`   GET /api/products ✅`);
  console.log(`   POST /api/products/analyze-photos ✅ (fallback)`);
});
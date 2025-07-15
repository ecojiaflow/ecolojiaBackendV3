// 📁 backend/src/app.js – VERSION COMPLÈTE MULTI-CATÉGORIES

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

/* -------------------------------------------------------------------------- */
/*                         IMPORTS BASE & SERVICES                            */
/* -------------------------------------------------------------------------- */
const {
  testConnection,
  isPostgreSQLConnected,
  getAllProducts,
  getProductByBarcode,
  getProductBySlug,
} = require('./db/pool');

const analyzeRoutes = require('./routes/analyze.routes');

// 🆕 IMPORT MULTI-CATÉGORIES (avec fallback)
let multiCategoryRoutes;
try {
  multiCategoryRoutes = require('./routes/multiCategory.routes');
  console.log('✅ Routes multi-catégories chargées');
} catch (error) {
  console.warn('⚠️ Routes multi-catégories non disponibles:', error.message);
  // Route fallback minimale
  multiCategoryRoutes = require('express').Router();
  multiCategoryRoutes.post('/analyze', (req, res) => {
    res.json({
      success: true,
      category: 'food',
      analysis: { overall_score: 50 },
      alternatives: [],
      message: 'Service multi-catégories en cours de déploiement'
    });
  });
  multiCategoryRoutes.get('/categories', (req, res) => {
    res.json({
      success: true,
      categories: [
        { id: 'food', name: 'Alimentaire', available: true },
        { id: 'cosmetics', name: 'Cosmétiques', available: false },
        { id: 'detergents', name: 'Détergents', available: false }
      ],
      message: 'Service multi-catégories en déploiement'
    });
  });
  multiCategoryRoutes.get('/health', (req, res) => {
    res.json({ status: 'fallback', service: 'MultiCategory Fallback' });
  });
}

/* -------------------------------------------------------------------------- */
/*                              CONFIG CORS                                   */
/* -------------------------------------------------------------------------- */
const PROD = process.env.NODE_ENV === 'production';

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'https://frontendv3.netlify.app,https://ecolojiafrontv3.netlify.app,https://main--ecolojiafrontv3.netlify.app,https://ecolojiabackendv3.onrender.com,http://localhost:3000,http://localhost:5173,http://localhost:4173'
)
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || origin.includes('.netlify.app') || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      if (!PROD) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
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
      'x-anonymous-id',
      'x-user-id'
    ],
  })
);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* -------------------------------------------------------------------------- */
/*                            FALLBACK PRODUITS                               */
/* -------------------------------------------------------------------------- */
const fallbackProducts = [
  {
    id: 'fallback_1',
    title: 'Service Temporairement Indisponible',
    slug: 'service-indisponible',
    description: 'Le service de produits est temporairement indisponible',
    brand: 'Système',
    category: 'maintenance',
    eco_score: '0.50',
    ai_confidence: '1.00',
    confidence_pct: 100,
    confidence_color: 'yellow',
    verified_status: 'system',
    tags: ['système', 'maintenance'],
    zones_dispo: ['FR'],
    image_url: 'https://via.assets.so/img.jpg?w=300&h=200&tc=orange&bg=%23f3f4f6&t=Maintenance',
    prices: { default: 0 },
    resume_fr: 'Service en maintenance - PostgreSQL reconnexion en cours',
    barcode: '0000000000000',
  },
];

/* -------------------------------------------------------------------------- */
/*                              ROUTES API                                    */
/* -------------------------------------------------------------------------- */

// 🆕 ROUTES MULTI-CATÉGORIES (NOUVEAU)
app.use('/api/multi-category', multiCategoryRoutes);

// 🔄 ROUTES EXISTANTES
app.use('/api/analyze', analyzeRoutes);

// 🆕 ANALYSE V3 COMPATIBLE (pont entre ancien et nouveau système)
app.post('/api/analyze-v3', async (req, res) => {
  try {
    const { product, context = {} } = req.body;
    
    // Tentative d'utilisation du nouveau service multi-catégories
    try {
      const MultiCategoryRouter = require('./services/ai/multiCategoryRouter');
      const multiService = new MultiCategoryRouter();
      
      const result = await multiService.analyzeProduct(product, {
        ...context,
        userId: req.headers['x-anonymous-id'] || req.headers['x-user-id'] || req.ip,
        startTime: Date.now()
      });
      
      return res.json({
        ...result,
        api_version: '3.0-multi',
        legacy_compatible: true,
        migration_note: 'Utilisez /api/multi-category/analyze pour la version native'
      });
      
    } catch (multiError) {
      console.warn('Service multi-catégories échoué, fallback vers analyze classique:', multiError.message);
    }
    
    // Fallback vers service analyze existant
    return res.json({
      success: true,
      category: 'food',
      analysis: {
        overall_score: 65,
        confidence: 0.7,
        message: 'Analyse de base - service complet en déploiement'
      },
      alternatives: [],
      metadata: {
        api_version: '1.0-fallback',
        processing_time_ms: 100,
        fallback_reason: 'Multi-category service unavailable'
      }
    });
    
  } catch (error) {
    console.error('Erreur analyze-v3:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback_available: true
    });
  }
});

// 🧪 TEST
app.get('/api/test-barcode', (_req, res) => {
  res.json({ success: true, message: 'Route barcode test OK', timestamp: Date.now() });
});

// 📦 PRODUITS
app.get('/api/products', async (req, res) => {
  try {
    const { limit = 50, offset = 0, q } = req.query;
    if (isPostgreSQLConnected()) {
      try {
        const products = await getAllProducts(Number(limit), Number(offset), q?.trim() || null);
        return res.json(products);
      } catch (pgErr) {
        console.error('PostgreSQL error, fallback', pgErr.message);
      }
    }
    let results = [...fallbackProducts];
    if (q) {
      const query = q.toLowerCase();
      results = results.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    const start = Number(offset);
    res.json(results.slice(start, start + Number(limit)));
  } catch (err) {
    res.status(500).json({ error: 'Erreur de récupération produits', message: err.message });
  }
});

// 🔍 SEARCH
app.get('/api/products/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || !q.trim()) return res.json({ products: [], count: 0, query: '' });

    if (isPostgreSQLConnected()) {
      try {
        const products = await getAllProducts(Number(limit), 0, q.trim());
        return res.json({ products, count: products.length, query: q.trim(), source: 'postgresql' });
      } catch (e) {
        console.error('PostgreSQL search error', e.message);
      }
    }

    const query = q.toLowerCase();
    const found = fallbackProducts.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query)
    ).slice(0, Number(limit));
    res.json({ products: found, count: found.length, query: q.trim(), source: 'fallback' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur search', message: err.message });
  }
});

// 🔍 SLUG
app.get('/api/products/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (isPostgreSQLConnected()) {
      try {
        const product = await getProductBySlug(slug);
        if (product) return res.json(product);
      } catch (e) {
        console.error('PostgreSQL slug error', e.message);
      }
    }
    const product = fallbackProducts.find(p => p.slug === slug || p.id === slug);
    if (!product) return res.status(404).json({ error: 'Produit non trouvé', slug });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erreur slug', message: err.message });
  }
});

// 🔍 BARCODE
app.get('/api/products/barcode/:code', async (req, res) => {
  try {
    const code = req.params.code.replace(/[^\d]/g, '');
    if (code.length < 8) return res.status(400).json({ error: 'Code-barres invalide' });

    if (isPostgreSQLConnected()) {
      try {
        const product = await getProductByBarcode(code);
        if (product) return res.json({ success: true, product, barcode: code, source: 'postgresql' });
      } catch (e) {
        console.error('PostgreSQL barcode error', e.message);
      }
    }

    const product = fallbackProducts.find(p => p.barcode === code);
    if (product) return res.json({ success: true, product, barcode: code, source: 'fallback' });

    res.status(404).json({ success: false, error: 'Produit non trouvé', barcode: code });
  } catch (err) {
    res.status(500).json({ error: 'Erreur barcode', message: err.message });
  }
});

// 🧪 ANALYSE PHOTOS MOCK
app.post('/api/products/analyze-photos', (req, res) => {
  const { barcode, photos } = req.body;
  if (!barcode || !photos) return res.status(400).json({ error: 'Barcode et photos requis' });
  res.json({ success: true, message: 'Analyse mock OK', redirect_url: `/product/produit-eco-${Date.now()}` });
});

// 🏠 ROOT INFO (VERSION ÉTENDUE)
app.get('/', async (req, res) => {
  try {
    let count = fallbackProducts.length;
    let statusDB = 'Fallback only';
    let multiCategoryStatus = 'Non disponible';
    let availableCategories = [];

    // Test base de données existante
    if (isPostgreSQLConnected()) {
      try {
        const { pool } = require('./db/pool');
        const r = await pool.query('SELECT COUNT(*) FROM products');
        count = Number(r.rows[0].count);
        statusDB = 'PostgreSQL connected';
      } catch (err) {
        console.warn('Count error', err.message);
      }
    }

    // Test service multi-catégories
    try {
      const MultiCategoryRouter = require('./services/ai/multiCategoryRouter');
      const multiService = new MultiCategoryRouter();
      const healthCheck = await multiService.healthCheck();
      multiCategoryStatus = healthCheck.status || 'Disponible';
      availableCategories = healthCheck.available_categories || [];
    } catch (err) {
      multiCategoryStatus = 'Service non initialisé';
      availableCategories = ['food']; // Fallback
    }

    res.json({
      message: 'Ecolojia API Multi-Catégories',
      version: '1.3.0-multi',
      products_count: count,
      database: statusDB,
      multi_category_service: multiCategoryStatus,
      available_categories: availableCategories,
      available_endpoints: [
        'GET /api/products - Liste produits',
        'POST /api/analyze - Analyse v1 (alimentaire)',
        'POST /api/analyze-v3 - Analyse v3 (compatible)',
        'POST /api/multi-category/analyze - Analyse multi-catégories native',
        'GET /api/multi-category/categories - Liste catégories',
        'GET /api/multi-category/health - Santé service multi-catégories',
        'GET /api/health - Santé système global'
      ],
      deployment: {
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        uptime_seconds: process.uptime()
      },
      ts: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Root error', message: err.message });
  }
});

// ❤️ HEALTH (VERSION ÉTENDUE)
app.get(['/health', '/api/health'], async (req, res) => {
  const health = {
    status: 'ok',
    database: isPostgreSQLConnected() ? 'postgresql' : 'fallback',
    multi_category: 'unknown',
    services: {},
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  // Test santé service multi-catégories
  try {
    const MultiCategoryRouter = require('./services/ai/multiCategoryRouter');
    const multiService = new MultiCategoryRouter();
    const multiHealth = await multiService.healthCheck();
    
    health.multi_category = multiHealth.status;
    health.services.multi_category = {
      status: multiHealth.status,
      available_categories: multiHealth.available_categories || [],
      analyzers_count: multiHealth.analyzers_count || 0,
      last_check: multiHealth.last_check
    };
    
  } catch (error) {
    health.multi_category = 'error';
    health.services.multi_category = {
      status: 'error',
      error: error.message,
      fallback_active: true
    };
  }

  // Test autres services
  health.services.database = {
    status: health.database,
    connected: isPostgreSQLConnected()
  };

  // Statut global
  const isHealthy = health.status === 'ok' && 
                   health.database !== 'error' && 
                   health.multi_category !== 'error';

  health.overall_status = isHealthy ? 'healthy' : 'degraded';

  res.status(isHealthy ? 200 : 503).json(health);
});

// 🔚 404
app.use('*', (req, res) => res.status(404).json({ 
  error: 'Route non trouvée', 
  path: req.originalUrl,
  available_routes: [
    '/api/products',
    '/api/analyze',
    '/api/multi-category/*',
    '/health'
  ]
}));

/* -------------------------------------------------------------------------- */
/*                            INITIALISATION                                  */
/* -------------------------------------------------------------------------- */

// 🔌 INIT POSTGRESQL
console.log('🔌 Initialisation PostgreSQL...');
testConnection()
  .then(success => {
    if (success) console.log('✅ Base PostgreSQL connectée');
    else console.log('⚠️ PostgreSQL indisponible – Fallback activé');
  })
  .catch(e => console.error('❌ PostgreSQL init error', e.message));

// 🆕 INIT MULTI-CATÉGORIES
console.log('🔌 Initialisation services multi-catégories...');
try {
  const MultiCategoryRouter = require('./services/ai/multiCategoryRouter');
  const multiService = new MultiCategoryRouter();
  multiService.healthCheck()
    .then(health => {
      console.log(`✅ Service multi-catégories initialisé`);
      console.log(`📊 Statut: ${health.status}`);
      console.log(`🔧 Analyseurs: ${health.analyzers_count || 0}`);
      console.log(`📂 Catégories: ${health.available_categories?.join(', ') || 'aucune'}`);
    })
    .catch(err => {
      console.log('⚠️ Service multi-catégories partiellement disponible:', err.message);
      console.log('📋 Mode fallback activé - fonctionnalités de base disponibles');
    });
} catch (error) {
  console.log('⚠️ Service multi-catégories non disponible');
  console.log('📋 Analyse alimentaire classique maintenue');
  console.log('🔄 Les services multi-catégories seront disponibles après déploiement complet');
}

/* ------------------------ Shutdown propre ------------------------ */
process.on('SIGTERM', async () => {
  console.log('SIGTERM: Closing connections...');
  
  // Fermeture pool PostgreSQL
  try {
    const { pool } = require('./db/pool');
    if (pool) await pool.end();
    console.log('✅ PostgreSQL pool fermé');
  } catch (e) {
    console.warn('⚠️ Erreur fermeture PostgreSQL:', e.message);
  }
  
  console.log('👋 Arrêt propre du serveur');
  process.exit(0);
});

// Gestion erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Ne pas fermer le processus en production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Ne pas fermer le processus en production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

module.exports = app;
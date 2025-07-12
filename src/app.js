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

/* -------------------------------------------------------------------------- */
/*                              CONFIG CORS                                   */
/* -------------------------------------------------------------------------- */
const PROD = process.env.NODE_ENV === 'production';

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'https://frontendv3.netlify.app,https://ecolojiafrontv3.netlify.app,https://main--ecolojiafrontv3.netlify.app,https://ecolojia-backend-working.onrender.com,http://localhost:3000,http://localhost:5173,http://localhost:5174'
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
      'x-anonymous-id' // 🔥 requis par frontend
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
app.use('/api/analyze', analyzeRoutes);

app.get('/api/test-barcode', (_req, res) => {
  res.json({ success: true, message: 'Route barcode test OK', timestamp: Date.now() });
});

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

app.post('/api/products/analyze-photos', (req, res) => {
  const { barcode, photos } = req.body;
  if (!barcode || !photos) return res.status(400).json({ error: 'Barcode et photos requis' });
  res.json({ success: true, message: 'Analyse mock OK', redirect_url: `/product/produit-eco-${Date.now()}` });
});

app.get('/', async (req, res) => {
  try {
    let count = fallbackProducts.length;
    let statusDB = 'Fallback only';

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

    res.json({
      message: 'Ecolojia API',
      version: '1.2.0',
      products_count: count,
      database: statusDB,
      ts: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Root error', message: err.message });
  }
});

app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', db: isPostgreSQLConnected() ? 'postgresql' : 'fallback', ts: Date.now() });
});

app.use('*', (req, res) => res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl }));

console.log('🔌 Initialisation PostgreSQL...');
testConnection()
  .then(success => {
    if (success) console.log('✅ Base PostgreSQL connectée');
    else console.log('⚠️ PostgreSQL indisponible – Fallback activé');
  })
  .catch(e => console.error('❌ init error', e.message));

process.on('SIGTERM', async () => {
  console.log('SIGTERM: Closing PG pool...');
  const { pool } = require('./db/pool');
  if (pool) await pool.end();
  process.exit(0);
});

module.exports = app;

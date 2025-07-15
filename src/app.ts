// PATH: backend/src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import analyzeRoutes from './routes/analyze.routes';
import multiCategoryRoutesFallback from './routes/multiCategory.routes';
import { testConnection, isPostgreSQLConnected, getAllProducts, getProductByBarcode, getProductBySlug } from './db/pool';

dotenv.config();

const app = express();
const PROD = process.env.NODE_ENV === 'production';

/* -------------------- CORS CONFIGURATION -------------------- */
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'https://frontendv3.netlify.app,https://ecolojiafrontv3.netlify.app,https://main--ecolojiafrontv3.netlify.app,https://ecolojiabackendv3.onrender.com,http://localhost:3000,http://localhost:5173,http://localhost:4173'
)
  .split(',')
  .map(o => o.trim());

app.use(cors({
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
    'Content-Type', 'Authorization', 'x-cron-key', 'x-api-key',
    'X-Requested-With', 'Accept', 'Origin', 'x-anonymous-id', 'x-user-id'
  ]
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* -------------------- FALLBACK PRODUITS -------------------- */
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
    barcode: '0000000000000'
  }
];

/* -------------------- ROUTES -------------------- */
app.use('/api/analyze', analyzeRoutes);

try {
  const multiCategoryRoutes = multiCategoryRoutesFallback;
  app.use('/api/multi-category', multiCategoryRoutes);
  console.log('✅ Routes multi-catégories chargées');
} catch (err: any) {
  console.warn('⚠️ Routes multi-catégories non disponibles :', err.message);
}

app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, q } = req.query;

    if (isPostgreSQLConnected()) {
      const products = await getAllProducts(Number(limit), Number(offset), q?.toString().trim() || null);
      return res.json(products);
    }

    let results = [...fallbackProducts];
    if (q) {
      const query = q.toString().toLowerCase();
      results = results.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    res.json(results.slice(Number(offset), Number(offset) + Number(limit)));
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur récupération produits', message: err.message });
  }
});

app.get('/api/products/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || !q.toString().trim()) return res.json({ products: [], count: 0, query: '' });

    if (isPostgreSQLConnected()) {
      const products = await getAllProducts(Number(limit), 0, q.toString().trim());
      return res.json({ products, count: products.length, query: q.toString().trim(), source: 'postgresql' });
    }

    const query = q.toString().toLowerCase();
    const found = fallbackProducts.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query)
    ).slice(0, Number(limit));

    res.json({ products: found, count: found.length, query: q.toString().trim(), source: 'fallback' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur search', message: err.message });
  }
});

app.get('/api/products/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (isPostgreSQLConnected()) {
      const product = await getProductBySlug(slug);
      if (product) return res.json(product);
    }

    const product = fallbackProducts.find(p => p.slug === slug || p.id === slug);
    if (!product) return res.status(404).json({ error: 'Produit non trouvé', slug });
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur slug', message: err.message });
  }
});

app.get('/api/products/barcode/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.replace(/[^\d]/g, '');
    if (code.length < 8) return res.status(400).json({ error: 'Code-barres invalide' });

    if (isPostgreSQLConnected()) {
      const product = await getProductByBarcode(code);
      if (product) return res.json({ success: true, product, barcode: code, source: 'postgresql' });
    }

    const product = fallbackProducts.find(p => p.barcode === code);
    if (product) return res.json({ success: true, product, barcode: code, source: 'fallback' });

    res.status(404).json({ success: false, error: 'Produit non trouvé', barcode: code });
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur barcode', message: err.message });
  }
});

app.get('/', async (_req: Request, res: Response) => {
  try {
    let count = fallbackProducts.length;
    let dbStatus = 'fallback';
    if (isPostgreSQLConnected()) {
      const { pool } = await import('./db/pool');
      const r = await pool.query('SELECT COUNT(*) FROM products');
      count = Number(r.rows[0].count);
      dbStatus = 'postgresql';
    }

    res.json({
      message: 'Ecolojia API Multi-Catégories',
      version: '1.3.0-multi',
      database: dbStatus,
      products_count: count,
      ts: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Root error', message: err.message });
  }
});

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    available_routes: [
      '/api/products',
      '/api/analyze',
      '/api/multi-category/*',
      '/health'
    ]
  });
});

/* -------------------- EXPORT -------------------- */
export default app;
// EOF

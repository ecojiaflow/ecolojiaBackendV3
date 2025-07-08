const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// 🔌 IMPORT POOL POSTGRESQL
const { 
  testConnection, 
  isPostgreSQLConnected,
  getAllProducts,
  getProductByBarcode,
  getProductBySlug 
} = require('./db/pool');

// 📦 PRODUITS DE SECOURS (FALLBACK UNIQUEMENT)
const fallbackProducts = [
  {
    id: "fallback_1",
    title: "Service Temporairement Indisponible",
    slug: "service-indisponible",
    description: "Le service de produits est temporairement indisponible",
    brand: "Système",
    category: "maintenance",
    eco_score: "0.50",
    ai_confidence: "1.00",
    confidence_pct: 100,
    confidence_color: "yellow",
    verified_status: "system",
    tags: ["système", "maintenance"],
    zones_dispo: ["FR"],
    image_url: "https://via.assets.so/img.jpg?w=300&h=200&tc=orange&bg=%23f3f4f6&t=Maintenance",
    prices: { default: 0 },
    resume_fr: "Service en maintenance - PostgreSQL reconnexion en cours",
    barcode: "0000000000000"
  }
];

// CORS SÉCURISÉ
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

// 🧪 ROUTE TEST
app.get('/api/test-barcode', (req, res) => {
  const dbStatus = isPostgreSQLConnected() ? 'PostgreSQL' : 'Fallback';
  res.json({ 
    success: true,
    message: 'Route barcode test fonctionne !', 
    timestamp: new Date().toISOString(),
    source: 'postgresql-activated',
    database: dbStatus,
    note: 'ÉTAPE 1 RÉUSSIE - PostgreSQL activé'
  });
});

// 📦 ROUTE PRODUITS - POSTGRESQL PRIORITAIRE
app.get('/api/products', async (req, res) => {
  try {
    console.log(`📋 Récupération produits (PostgreSQL prioritaire)...`);
    
    const { limit = 50, offset = 0, q } = req.query;
    
    // ESSAI POSTGRESQL EN PREMIER
    if (isPostgreSQLConnected()) {
      try {
        const products = await getAllProducts(
          parseInt(limit), 
          parseInt(offset), 
          q ? q.trim() : null
        );
        
        console.log(`✅ ${products.length} produits PostgreSQL retournés`);
        return res.json(products);
        
      } catch (pgError) {
        console.error('❌ Erreur PostgreSQL, fallback:', pgError.message);
      }
    }
    
    // FALLBACK UNIQUEMENT SI POSTGRESQL ÉCHEC
    console.log('🔄 Utilisation fallback (PostgreSQL indisponible)');
    let results = [...fallbackProducts];
    
    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      results = results.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    const startIndex = parseInt(offset);
    const limitNum = parseInt(limit);
    const paginatedResults = results.slice(startIndex, startIndex + limitNum);
    
    console.log(`⚠️ ${paginatedResults.length} produits fallback (PostgreSQL déconnecté)`);
    res.json(paginatedResults);
    
  } catch (error) {
    console.error('❌ Erreur route /products:', error);
    res.status(500).json({
      error: 'Erreur de récupération produits',
      message: error.message,
      source: 'postgresql_error'
    });
  }
});

// 🔍 ROUTE SEARCH - POSTGRESQL PRIORITAIRE
app.get('/api/products/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({ products: [], count: 0, query: '', source: 'postgresql' });
    }
    
    // ESSAI POSTGRESQL
    if (isPostgreSQLConnected()) {
      try {
        const products = await getAllProducts(parseInt(limit), 0, q.trim());
        
        const searchResults = products.map(product => ({
          id: product.id,
          title: product.title,
          slug: product.slug,
          brand: product.brand,
          eco_score: product.eco_score,
          image_url: product.image_url
        }));
        
        console.log(`✅ ${searchResults.length} résultats recherche PostgreSQL`);
        return res.json({ 
          products: searchResults, 
          count: searchResults.length, 
          query: q.trim(),
          source: 'postgresql'
        });
        
      } catch (pgError) {
        console.error('❌ Erreur search PostgreSQL:', pgError.message);
      }
    }
    
    // FALLBACK SEARCH
    const query = q.toLowerCase().trim();
    const results = fallbackProducts.filter(product => 
      product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query)
    ).slice(0, parseInt(limit));
    
    console.log(`⚠️ ${results.length} résultats fallback search`);
    res.json({ 
      products: results, 
      count: results.length, 
      query: q.trim(),
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Erreur search:', error);
    res.status(500).json({ 
      products: [], 
      count: 0, 
      error: 'Erreur de recherche',
      source: 'error'
    });
  }
});

// 📄 ROUTE SLUG - POSTGRESQL PRIORITAIRE
app.get('/api/products/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // ESSAI POSTGRESQL
    if (isPostgreSQLConnected()) {
      try {
        const product = await getProductBySlug(slug);
        
        if (product) {
          console.log(`✅ Produit trouvé PostgreSQL: ${product.title}`);
          return res.json(product);
        }
        
      } catch (pgError) {
        console.error('❌ Erreur slug PostgreSQL:', pgError.message);
      }
    }
    
    // FALLBACK SLUG
    const product = fallbackProducts.find(p => p.slug === slug || p.id === slug);
    
    if (!product) {
      return res.status(404).json({ 
        error: 'Produit non trouvé',
        slug: slug,
        source: 'fallback'
      });
    }
    
    console.log(`⚠️ Produit fallback: ${product.title}`);
    res.json(product);
    
  } catch (error) {
    console.error('❌ Erreur slug:', error);
    res.status(500).json({ 
      error: 'Erreur récupération produit',
      source: 'error'
    });
  }
});

// 📊 ROUTE BARCODE - POSTGRESQL PRIORITAIRE
app.get('/api/products/barcode/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const cleanBarcode = code.trim().replace(/[^\d]/g, '');
    
    if (cleanBarcode.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Code-barres invalide",
        barcode: code,
        source: 'validation'
      });
    }
    
    console.log(`🔍 Recherche barcode: ${cleanBarcode}`);
    
    // ESSAI POSTGRESQL EN PRIORITÉ
    if (isPostgreSQLConnected()) {
      try {
        const product = await getProductByBarcode(cleanBarcode);
        
        if (product) {
          console.log(`✅ Produit trouvé PostgreSQL: ${product.title}`);
          return res.json({
            success: true,
            product: product,
            barcode: cleanBarcode,
            search_method: 'postgresql_database',
            source: 'postgresql'
          });
        }
        
      } catch (pgError) {
        console.error('❌ Erreur barcode PostgreSQL:', pgError.message);
      }
    }
    
    // FALLBACK BARCODE
    const product = fallbackProducts.find(p => p.barcode === cleanBarcode);
    
    if (product) {
      console.log(`⚠️ Produit trouvé fallback: ${product.title}`);
      return res.json({
        success: true,
        product: product,
        barcode: cleanBarcode,
        search_method: 'fallback_database',
        source: 'fallback'
      });
    }
    
    // PRODUIT NON TROUVÉ
    console.log(`❌ Produit non trouvé: ${cleanBarcode}`);
    res.status(404).json({
      success: false,
      error: "Produit non trouvé dans notre base de données",
      barcode: cleanBarcode,
      suggestion_url: `/product-not-found?barcode=${cleanBarcode}`,
      message: "Aidez-nous à enrichir notre base en photographiant ce produit",
      source: 'not_found'
    });
    
  } catch (error) {
    console.error('❌ Erreur barcode:', error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la recherche",
      message: error.message,
      source: 'error'
    });
  }
});

// 📸 ROUTE ANALYSE PHOTOS
app.post('/api/products/analyze-photos', (req, res) => {
  const { barcode, photos } = req.body;

  if (!barcode || !photos) {
    return res.status(400).json({
      success: false,
      error: "Code-barres et photos requis"
    });
  }

  // TODO ÉTAPE 3: Intégrer vraie OCR
  res.json({
    success: true,
    message: "Produit analysé et créé avec succès",
    productName: "Produit Éco Analysé",
    ecoScore: 75,
    redirect_url: `/product/produit-eco-${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: 'postgresql_ready',
    note: 'ÉTAPE 3: OCR à implémenter'
  });
});

// 🏠 ROOT ENDPOINT
app.get('/', async (req, res) => {
  try {
    let productCount = 0;
    let databaseStatus = 'Fallback uniquement';
    
    if (isPostgreSQLConnected()) {
      try {
        // Compter via pool PostgreSQL
        const { pool } = require('./db/pool');
        const client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) as count FROM products');
        productCount = parseInt(result.rows[0].count);
        client.release();
        
        databaseStatus = 'PostgreSQL connectée ✅';
      } catch (error) {
        console.warn('⚠️ Erreur count PostgreSQL:', error.message);
        databaseStatus = 'PostgreSQL erreur, fallback actif';
        productCount = fallbackProducts.length;
      }
    } else {
      productCount = fallbackProducts.length;
      databaseStatus = 'PostgreSQL déconnectée, fallback actif';
    }
    
    res.json({
      message: 'Ecolojia API - ÉTAPE 1 RÉUSSIE',
      version: '1.1.0',
      status: 'operational',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      etape_status: 'ÉTAPE 1 TERMINÉE - PostgreSQL activé',
      products_count: productCount,
      database: databaseStatus,
      postgresql_enabled: isPostgreSQLConnected(),
      prochaine_etape: 'ÉTAPE 2: Import OpenFoodFacts 200+ produits',
      endpoints: {
        products: [
          'GET /api/products ✅ (PostgreSQL prioritaire)',
          'GET /api/products/search ✅ (PostgreSQL prioritaire)', 
          'GET /api/products/:slug ✅ (PostgreSQL prioritaire)',
          'GET /api/products/barcode/:code ✅ (PostgreSQL prioritaire)',
          'POST /api/products/analyze-photos ✅ (Prêt pour ÉTAPE 3)'
        ],
        test: ['GET /api/test-barcode ✅'],
        health: ['GET /health ✅', 'GET /api/health ✅']
      }
    });
  } catch (error) {
    res.json({
      message: 'Ecolojia API - Erreur status',
      error: error.message,
      products_count: fallbackProducts.length,
      database: 'Fallback uniquement'
    });
  }
});

// 🏥 HEALTH CHECKS
app.get('/health', (req, res) => {
  const dbStatus = isPostgreSQLConnected() ? 'postgresql' : 'fallback';
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    etape: 'ÉTAPE 1 TERMINÉE'
  });
});

app.get('/api/health', (req, res) => {
  const dbStatus = isPostgreSQLConnected() ? 'postgresql' : 'fallback';
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    etape: 'ÉTAPE 1 TERMINÉE'
  });
});

// 🔌 INITIALISATION POSTGRESQL AU DÉMARRAGE
console.log('🔌 Initialisation PostgreSQL...');
testConnection().then((success) => {
  if (success) {
    console.log('🎉 ÉTAPE 1 RÉUSSIE - PostgreSQL activé');
    console.log('✅ Base de données connectée');
    console.log('🚀 Prêt pour ÉTAPE 2: Import OpenFoodFacts');
  } else {
    console.log('⚠️ PostgreSQL indisponible - Mode fallback');
    console.log('🔧 Vérifiez DATABASE_URL et connexion réseau');
    console.log('📋 Fallback: 1 produit de maintenance disponible');
  }
}).catch((error) => {
  console.error('❌ Erreur initialisation PostgreSQL:', error);
  console.log('🔄 Mode fallback par défaut');
});

// Nettoyage à la fermeture
process.on('beforeExit', async () => {
  console.log('🔌 Fermeture connexions...');
  const { pool } = require('./db/pool');
  if (pool) {
    await pool.end();
  }
});

module.exports = app;
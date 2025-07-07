const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

console.log('🌱 ECOLOJIA Backend - Démarrage avec PostgreSQL');
console.log('📊 Connexion Prisma en cours...');

// CORS - MÊME CONFIGURATION QUE VOTRE VERSION
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

// Middlewares - MÊME CONFIGURATION QUE VOTRE VERSION
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 🧪 ROUTE TEST BARCODE - IDENTIQUE À VOTRE VERSION
app.get('/api/test-barcode', (req, res) => {
  res.json({ 
    success: true,
    message: 'Route barcode test fonctionne !', 
    timestamp: new Date().toISOString(),
    source: 'direct-app-js',
    note: 'Route de test JavaScript - MVP débloqué'
  });
});

// 📦 ROUTE PRODUITS - MAINTENANT AVEC POSTGRESQL AU LIEU DE MOCK
app.get('/api/products', async (req, res) => {
  try {
    console.log('📋 Récupération produits depuis PostgreSQL...');
    
    const { limit = 50, offset = 0, q } = req.query;
    
    // Construire la requête Prisma
    const whereClause = {};
    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } }
      ];
      console.log(`🔍 Recherche "${query}" en PostgreSQL`);
    }
    
    // Récupérer depuis PostgreSQL
    const products = await prisma.product.findMany({
      where: whereClause,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`✅ ${products.length} produits récupérés depuis PostgreSQL`);

    // Transformer pour le frontend (même format que vos produits mock)
    const transformedProducts = products.map(product => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      category: product.category,
      eco_score: product.eco_score ? Number(product.eco_score).toFixed(2) : "0.50",
      ai_confidence: product.ai_confidence ? Number(product.ai_confidence).toFixed(2) : "0.70",
      confidence_pct: product.confidence_pct || 70,
      confidence_color: product.confidence_color || 'yellow',
      verified_status: product.verified_status || 'ai_analyzed',
      tags: product.tags || [],
      zones_dispo: product.zones_dispo || ['FR'],
      image_url: product.images?.[0] || `https://via.assets.so/img.jpg?w=300&h=200&tc=green&bg=%23f3f4f6&t=${encodeURIComponent(product.title)}`,
      prices: product.prices || { default: 0 },
      resume_fr: product.resume_fr || 'Produit bio référencé'
    }));

    res.json(transformedProducts);

  } catch (error) {
    console.error('❌ Erreur PostgreSQL:', error);
    
    // Fallback vers message d'erreur informatif
    res.status(500).json({
      error: 'Erreur de connexion PostgreSQL',
      message: error.message,
      fallback: 'Vérifiez DATABASE_URL dans les variables d\'environnement'
    });
  }
});

// 🔍 ROUTE SEARCH - POSTGRESQL
app.get('/api/products/search', async (req, res) => {
  try {
    console.log('🔍 Recherche produits PostgreSQL:', req.query);
    
    const { q, limit = 20 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({
        products: [],
        count: 0,
        query: ''
      });
    }
    
    const query = q.toLowerCase().trim();
    
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: parseInt(limit),
      orderBy: {
        eco_score: 'desc'
      }
    });
    
    const transformedProducts = products.map(product => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      category: product.category,
      eco_score: product.eco_score ? Number(product.eco_score).toFixed(2) : "0.50",
      confidence_pct: product.confidence_pct || 70,
      image_url: product.images?.[0] || `https://via.assets.so/img.jpg?w=300&h=200&tc=green&bg=%23f3f4f6&t=${encodeURIComponent(product.title)}`,
      resume_fr: product.resume_fr || 'Produit bio référencé'
    }));
    
    console.log(`🎯 Recherche "${query}" : ${transformedProducts.length} résultats PostgreSQL`);
    
    res.json({
      products: transformedProducts,
      count: transformedProducts.length,
      query: query
    });
    
  } catch (error) {
    console.error('❌ Erreur recherche PostgreSQL:', error);
    res.status(500).json({
      products: [],
      count: 0,
      error: 'Erreur de recherche'
    });
  }
});

// 📄 ROUTE PRODUIT PAR SLUG - POSTGRESQL
app.get('/api/products/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`🔍 Recherche produit par slug PostgreSQL: ${slug}`);
    
    const product = await prisma.product.findUnique({
      where: { slug: slug }
    });
    
    if (!product) {
      console.log(`❌ Produit non trouvé PostgreSQL: ${slug}`);
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    const transformedProduct = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      category: product.category,
      eco_score: product.eco_score ? Number(product.eco_score).toFixed(2) : "0.50",
      ai_confidence: product.ai_confidence ? Number(product.ai_confidence).toFixed(2) : "0.70",
      confidence_pct: product.confidence_pct || 70,
      confidence_color: product.confidence_color || 'yellow',
      verified_status: product.verified_status || 'ai_analyzed',
      tags: product.tags || [],
      zones_dispo: product.zones_dispo || ['FR'],
      image_url: product.images?.[0] || `https://via.assets.so/img.jpg?w=300&h=200&tc=green&bg=%23f3f4f6&t=${encodeURIComponent(product.title)}`,
      prices: product.prices || { default: 0 },
      resume_fr: product.resume_fr || 'Produit bio référencé',
      barcode: product.barcode
    };
    
    console.log(`✅ Produit trouvé PostgreSQL: ${product.title}`);
    res.json(transformedProduct);
    
  } catch (error) {
    console.error('❌ Erreur récupération produit PostgreSQL:', error);
    res.status(500).json({ error: 'Erreur de récupération produit' });
  }
});

// 📊 ROUTE BARCODE - POSTGRESQL (VRAIS CODES!)
app.get('/api/products/barcode/:code', async (req, res) => {
  try {
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

    console.log(`🔍 Recherche par code-barres PostgreSQL: ${cleanBarcode}`);
    
    // Rechercher dans PostgreSQL
    const product = await prisma.product.findFirst({
      where: {
        barcode: cleanBarcode
      }
    });

    if (product) {
      console.log(`✅ Produit trouvé par code-barres: ${product.title}`);
      
      const transformedProduct = {
        id: product.id,
        title: product.title,
        slug: product.slug,
        description: product.description,
        brand: product.brand,
        category: product.category,
        eco_score: product.eco_score ? Number(product.eco_score).toFixed(2) : "0.50",
        ai_confidence: product.ai_confidence ? Number(product.ai_confidence).toFixed(2) : "0.70",
        confidence_pct: product.confidence_pct || 70,
        confidence_color: product.confidence_color || 'yellow',
        verified_status: product.verified_status || 'ai_analyzed',
        tags: product.tags || [],
        zones_dispo: product.zones_dispo || ['FR'],
        image_url: product.images?.[0] || `https://via.assets.so/img.jpg?w=300&h=200&tc=green&bg=%23f3f4f6&t=${encodeURIComponent(product.title)}`,
        prices: product.prices || { default: 0 },
        resume_fr: product.resume_fr || 'Produit bio référencé',
        barcode: product.barcode
      };

      return res.json({
        success: true,
        product: transformedProduct,
        barcode: cleanBarcode,
        search_method: 'postgresql_database'
      });
    }
    
    // Produit non trouvé
    console.log(`❌ Produit non trouvé pour code-barres: ${cleanBarcode}`);
    res.status(404).json({
      success: false,
      error: "Produit non trouvé dans notre base de données",
      barcode: cleanBarcode,
      suggestion_url: `/product-not-found?barcode=${cleanBarcode}`,
      message: "Aidez-nous à enrichir notre base en photographiant ce produit",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur recherche barcode PostgreSQL:', error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la recherche",
      message: error.message
    });
  }
});

// 📸 ROUTE ANALYSE PHOTOS - IDENTIQUE À VOTRE VERSION
app.post('/api/products/analyze-photos', (req, res) => {
  const { barcode, photos } = req.body;

  if (!barcode || !photos) {
    return res.status(400).json({
      success: false,
      error: "Code-barres et photos requis"
    });
  }

  console.log(`📸 Analyse photos pour code-barres: ${barcode}`);
  
  // SIMULATION - Création produit avec IA
  const mockProduct = {
    id: `product_${Date.now()}`,
    title: "Produit Éco Analysé",
    brand: "EcoBrand",
    category: "Cosmétique",
    eco_score: 75,
    slug: `produit-eco-${Date.now()}`
  };

  res.json({
    success: true,
    message: "Produit analysé et créé avec succès",
    productId: mockProduct.id,
    productSlug: mockProduct.slug,
    productName: mockProduct.title,
    ecoScore: mockProduct.eco_score,
    redirect_url: `/product/${mockProduct.slug}`,
    timestamp: new Date().toISOString()
  });
});

// 🏠 ROOT ENDPOINT - AVEC VRAI COMPTE POSTGRESQL
app.get('/', async (req, res) => {
  try {
    // Compter les VRAIS produits PostgreSQL
    const productCount = await prisma.product.count();
    
    console.log(`📊 Nombre de produits PostgreSQL: ${productCount}`);
    
    res.json({
      message: 'Ecolojia API - MVP FONCTIONNEL',
      version: '1.0.0',
      status: 'operational',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      mvp_status: 'DÉBLOQUÉ - Routes barcode + produits PostgreSQL',
      products_count: productCount, // VRAI COMPTE depuis PostgreSQL !
      database: 'PostgreSQL connectée ✅',
      endpoints: {
        products: [
          'GET /api/products ✅',
          'GET /api/products/search ✅', 
          'GET /api/products/:slug ✅',
          'GET /api/products/barcode/:code ✅',
          'POST /api/products/analyze-photos ✅'
        ],
        test: [
          'GET /api/test-barcode ✅'
        ],
        health: [
          'GET /health ✅',
          'GET /api/health ✅'
        ]
      }
    });
  } catch (error) {
    console.error('❌ Erreur connexion PostgreSQL:', error);
    res.json({
      message: 'Ecolojia API - ERREUR PostgreSQL',
      error: error.message,
      products_count: 0,
      database: 'PostgreSQL déconnectée ❌'
    });
  }
});

// 🏥 HEALTH CHECKS - IDENTIQUES À VOTRE VERSION
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Nettoyage Prisma à la fermeture
process.on('beforeExit', async () => {
  console.log('🔌 Fermeture connexion PostgreSQL...');
  await prisma.$disconnect();
});

module.exports = app;
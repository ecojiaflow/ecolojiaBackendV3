// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const redis = require('redis');

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 5001;

// Configuration CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
const logger = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args)
};

// Connexion MongoDB
async function connectMongoDB() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI not configured');
    }

    await mongoose.connect(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000
    });

    logger.info('✅ MongoDB Atlas connected successfully');
    
    // Log des collections disponibles
    const collections = await mongoose.connection.db.listCollections().toArray();
    logger.info(`📦 Collections disponibles: ${collections.map(c => c.name).join(', ')}`);
    
    return true;
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

// Connexion Redis (optionnel)
let redisClient;
async function connectRedis() {
  try {
    if (process.env.REDIS_URL) {
      redisClient = redis.createClient({
        url: process.env.REDIS_URL
      });
      
      redisClient.on('error', (err) => logger.error('Redis error:', err));
      
      await redisClient.connect();
      logger.info('✅ Redis connected successfully');
    } else {
      logger.info('ℹ️ Redis not configured, skipping...');
    }
  } catch (error) {
    logger.warn('Redis connection failed:', error.message);
    // Continue sans Redis
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redisClient?.isReady ? 'connected' : 'disconnected';
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      mongodb: mongoStatus,
      redis: redisStatus
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '3.0.0'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'ECOLOJIA Backend V3 is running!',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1,
      redis: redisClient?.isReady || false,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      algolia: !!process.env.ALGOLIA_APP_ID,
      lemonSqueezy: !!process.env.LEMONSQUEEZY_API_KEY
    }
  });
});

// Test direct partner route
app.get('/api/partner/test', (req, res) => {
  res.json({
    success: true,
    message: 'Direct partner route works!',
    timestamp: new Date().toISOString()
  });
});

// Configuration des partenaires
const AFFILIATE_PARTNERS = {
  lafourche: {
    baseUrl: 'https://www.lafourche.fr',
    affiliateId: process.env.AFFILIATE_LAFOURCHE_ID || 'ecolojia-001',
    trackingParam: 'aff',
    categories: ['bio', 'vrac', 'zero-dechet']
  },
  kazidomi: {
    baseUrl: 'https://www.kazidomi.com',
    affiliateId: process.env.AFFILIATE_KAZIDOMI_ID || 'ECO2025',
    trackingParam: 'partner',
    categories: ['bio', 'vegan', 'sans-gluten']
  },
  greenweez: {
    baseUrl: 'https://www.greenweez.com',
    affiliateId: process.env.AFFILIATE_GREENWEEZ_ID || 'partner-ecolojia',
    trackingParam: 'utm_source',
    categories: ['eco-responsable', 'bio']
  }
};

// Route info partenaires
app.get('/api/partner/info', (req, res) => {
  res.json({
    success: true,
    partners: Object.entries(AFFILIATE_PARTNERS).map(([id, config]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      baseUrl: config.baseUrl,
      categories: config.categories
    })),
    endpoints: {
      test: 'GET /api/partner/test',
      info: 'GET /api/partner/info',
      track: 'GET /api/partner/track/:productId?partner=xxx',
      stats: 'GET /api/partner/stats?partner=xxx'
    }
  });
});

// Route pour récupérer les produits de test
app.get('/api/test/products', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const products = await Product.find().limit(5).select('_id name brand barcode category');
    res.json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route de tracking affilié
app.get('/api/partner/track/:id', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const AffiliateClick = require('./models/AffiliateClick');
    
    const { id: productId } = req.params;
    const { partner, source = 'product_page', campaign = 'organic' } = req.query;

    if (!partner || !AFFILIATE_PARTNERS[partner]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing partner parameter'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const userId = '507f1f77bcf86cd799439011'; // TODO: Get from auth
    const partnerConfig = AFFILIATE_PARTNERS[partner];
    const originalUrl = `${partnerConfig.baseUrl}/search?q=${encodeURIComponent(product.name)}`;

    const click = await AffiliateClick.createClick({
      userId,
      productId,
      partner,
      originalUrl,
      affiliateUrl: originalUrl,
      campaign,
      source,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    const url = new URL(originalUrl);
    url.searchParams.set(partnerConfig.trackingParam, partnerConfig.affiliateId);
    url.searchParams.set('utm_source', 'ecolojia');
    url.searchParams.set('click_id', click.clickId);

    const affiliateUrl = url.toString();
    click.affiliateUrl = affiliateUrl;
    await click.save();

    logger.info(`[Affiliate] Click tracked: ${click.clickId} -> ${partner}`);

    res.redirect(302, affiliateUrl);

  } catch (error) {
    logger.error('[Affiliate] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Route des statistiques
app.get('/api/partner/stats', async (req, res) => {
  try {
    const AffiliateClick = require('./models/AffiliateClick');
    const { partner, period = 30 } = req.query;

    if (!partner || !AFFILIATE_PARTNERS[partner]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid partner parameter'
      });
    }

    const stats = await AffiliateClick.getPartnerStats(partner, Number(period));

    res.json({
      success: true,
      data: {
        partner,
        period: Number(period),
        stats
      }
    });

  } catch (error) {
    logger.error('[Affiliate] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Route pour récupérer les produits de test
app.get('/api/test/products', async (req, res) => {
  try {
    const products = await Product.find().limit(5).select('_id name brand barcode category');
    res.json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Import et configuration des routes
function setupRoutes() {
  // Auth routes
  try {
    const authRoutes = require('./routes/auth');
    app.use('/api/auth', authRoutes);
    logger.info('✅ Auth routes loaded');
  } catch (error) {
    logger.warn('Auth routes not found:', error.message);
  }

  // Dashboard routes
  try {
    const dashboardRoutes = require('./routes/dashboard');
    app.use('/api/dashboard', dashboardRoutes);
    logger.info('✅ Dashboard routes loaded');
  } catch (error) {
    logger.warn('Dashboard routes not found:', error.message);
  }

  // Product routes
  try {
    const productRoutes = require('./routes/products');
    app.use('/api/products', productRoutes);
    logger.info('✅ Product routes loaded');
  } catch (error) {
    logger.warn('Product routes not found:', error.message);
  }

  // Analysis routes
  try {
    const analysisRoutes = require('./routes/analysis');
    app.use('/api/analysis', analysisRoutes);
    logger.info('✅ Analysis routes loaded');
  } catch (error) {
    logger.warn('Analysis routes not found:', error.message);
  }

  // Partner/Affiliate routes
  try {
    // Essayer d'abord le .ts compilé, puis le .js
    let partnerRoutes;
    try {
      partnerRoutes = require('./routes/partner.routes.js');
    } catch (e) {
      partnerRoutes = require('./routes/partner.routes');
    }
    app.use('/api/partner', partnerRoutes);
    logger.info('✅ Partner routes loaded');
  } catch (error) {
    logger.warn('Partner routes not found:', error.message);
    // Créer une route temporaire
    app.use('/api/partner', (req, res) => {
      res.json({ 
        success: false, 
        message: 'Partner routes not implemented yet',
        hint: 'Create partner.routes.js in routes folder'
      });
    });
  }

  // AI routes
  try {
    const aiRoutes = require('./routes/ai');
    app.use('/api/ai', aiRoutes);
    logger.info('✅ AI routes loaded');
  } catch (error) {
    logger.warn('AI routes not found:', error.message);
  }

  // Payment routes
  try {
    const paymentRoutes = require('./routes/payment');
    app.use('/api/payment', paymentRoutes);
    logger.info('✅ Payment routes loaded');
  } catch (error) {
    logger.warn('Payment routes not found:', error.message);
  }

  // Algolia routes
  try {
    const algoliaRoutes = require('./routes/algolia');
    app.use('/api/algolia', algoliaRoutes);
    logger.info('✅ Algolia routes loaded');
  } catch (error) {
    logger.warn('Algolia routes not found:', error.message);
  }
}

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      '/health',
      '/api/test',
      '/api/auth/*',
      '/api/dashboard/*',
      '/api/products/*',
      '/api/analysis/*',
      '/api/partner/*',
      '/api/ai/*',
      '/api/payment/*',
      '/api/algolia/*'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Démarrage du serveur
async function startServer() {
  try {
    // Connexion MongoDB (obligatoire)
    await connectMongoDB();
    
    // Connexion Redis (optionnel)
    await connectRedis();
    
    // Charger les routes
    setupRoutes();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      logger.info(`🗄️  MongoDB: Connected to Atlas`);
      logger.info(`💾 Redis: ${redisClient?.isReady ? 'Connected' : 'Not configured'}`);
      logger.info(`🔍 Algolia: ${process.env.ALGOLIA_APP_ID ? 'Configured' : 'Not configured'}`);
      logger.info(`💳 LemonSqueezy: ${process.env.LEMONSQUEEZY_STORE_ID ? 'Configured' : 'Not configured'}`);
      logger.info(`🤖 DeepSeek AI: ${process.env.DEEPSEEK_API_KEY ? 'Configured' : 'Not configured'}`);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  if (redisClient?.isReady) {
    await redisClient.quit();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  if (redisClient?.isReady) {
    await redisClient.quit();
  }
  process.exit(0);
});

// Démarrage
startServer();

module.exports = app;
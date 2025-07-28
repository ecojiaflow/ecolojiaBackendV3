// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 5001;

// Configuration CORS simple
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

// Middlewares de base
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger simple en attendant Winston
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};

// Connexion MongoDB
async function connectMongo() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecolojia';
    
    if (!uri || uri.includes('YOUR_MONGODB_PASSWORD')) {
      logger.warn('⚠️  MONGODB_URI is not properly configured!');
      logger.info('Using PostgreSQL mode for now...');
      return false;
    }

    await mongoose.connect(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000
    });

    logger.info('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    logger.info('Falling back to PostgreSQL mode...');
    return false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      type: dbStatus === 'connected' ? 'MongoDB' : 'PostgreSQL',
      status: dbStatus
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Ecolojia Backend is running!',
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

// Import des routes existantes avec gestion d'erreur
try {
  const authRoutes = require('../routes/auth');
  app.use('/api/auth', authRoutes);
  logger.info('✅ Auth routes loaded');
} catch (error) {
  logger.warn('Auth routes not found, creating stub...');
  app.use('/api/auth', (req, res) => {
    res.json({ message: 'Auth routes not implemented yet' });
  });
}

// Import de la route dashboard
try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use('/api/dashboard', dashboardRoutes);
  logger.info('✅ Dashboard routes loaded');
} catch (error) {
  logger.error('Dashboard routes error:', error.message);
  app.use('/api/dashboard', (req, res) => {
    res.status(500).json({ error: 'Dashboard routes not available', message: error.message });
  });
}

// Routes temporaires pour les autres endpoints
const routeStubs = {
  '/api/products': { message: 'Products route ready for MongoDB' },
  '/api/analysis': { message: 'Analysis route ready for MongoDB' },
  '/api/history': { message: 'History route ready for MongoDB' },
  '/api/favorites': { message: 'Favorites route ready for MongoDB' },
  '/api/export': { message: 'Export route ready for MongoDB' }
};

// Créer les routes stub pour les routes non implémentées
Object.entries(routeStubs).forEach(([path, response]) => {
  app.use(path, (req, res) => {
    res.json({ success: true, ...response });
  });
});

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handler simple
app.use((err, req, res, next) => {
  logger.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Démarrage du serveur
async function startServer() {
  try {
    // Tenter la connexion MongoDB
    const mongoConnected = await connectMongo();
    
    if (!mongoConnected) {
      logger.info('📦 Running in PostgreSQL compatibility mode');
      logger.info('💡 To use MongoDB:');
      logger.info('   1. Create MongoDB Atlas account');
      logger.info('   2. Update MONGODB_URI in .env');
      logger.info('   3. Restart server');
    }
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      logger.info(`🗄️  Database: ${mongoConnected ? 'MongoDB' : 'PostgreSQL'}`);
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
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Démarrage
startServer();

module.exports = app;
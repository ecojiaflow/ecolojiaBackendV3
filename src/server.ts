// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectMongo, getConnectionStats } = require('./config/db');
const logger = require('./utils/logger');

// Import des middlewares de sécurité
const { setupSecurity } = require('./middleware/security');
const { setupRateLimiting } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Import des routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const analysisRoutes = require('./routes/analysis');
const historyRoutes = require('./routes/history');
const favoritesRoutes = require('./routes/favorites');
const exportRoutes = require('./routes/export');
const dashboardRoutes = require('./routes/dashboard');

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 5001;

// Configuration CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Application des middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sécurité
setupSecurity(app);
setupRateLimiting(app);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStats = getConnectionStats();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStats,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler global
app.use(errorHandler);

// Démarrage du serveur
async function startServer() {
  try {
    // Connexion MongoDB
    await connectMongo();
    logger.info('✅ MongoDB connected successfully');
    
    // Démarrage serveur Express
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Gestion gracieuse de l'arrêt
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Lancer le serveur
startServer();

module.exports = app; // Pour les tests
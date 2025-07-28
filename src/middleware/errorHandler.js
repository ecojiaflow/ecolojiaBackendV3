// PATH: src/middleware/errorHandler.js
const { 
  AppError, 
  isOperationalError, 
  normalizeError,
  ValidationError 
} = require('../utils/errors');

/**
 * Middleware de gestion globale des erreurs
 */
const errorHandler = (err, req, res, next) => {
  // Normaliser l'erreur en AppError
  let error = normalizeError(err);

  // Logger l'erreur
  console.error('Error:', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // En développement, envoyer plus de détails
  if (process.env.NODE_ENV === 'development') {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
      timestamp: error.timestamp
    });
  } else {
    // En production, filtrer les erreurs sensibles
    if (isOperationalError(error)) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp
      });
    } else {
      // Erreur non-opérationnelle = erreur système
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Une erreur inattendue s\'est produite',
        statusCode: 500,
        timestamp: new Date()
      });
    }
  }
};

/**
 * Middleware pour capturer les erreurs 404
 */
const notFoundHandler = (req, res, next) => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  const error = new AppError(message, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

/**
 * Configuration du error handling pour Express
 */
const setupErrorHandling = (app) => {
  // Capturer les routes 404
  app.use(notFoundHandler);
  
  // Handler principal des erreurs
  app.use(errorHandler);
  
  // Gérer les promesses non gérées
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  console.log('✅ Error handling configured');
};

module.exports = {
  errorHandler,
  notFoundHandler,
  setupErrorHandling
};
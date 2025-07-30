// backend/src/utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Niveaux de log personnalisés
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
  }
};

// Ajouter les couleurs à Winston
winston.addColors(logLevels.colors);

// Format personnalisé pour la console
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, ...extra } = info;
    let log = `${timestamp} [${level}]`;
    if (context) log += ` [${context}]`;
    log += ` ${message}`;
    
    // Ajouter les métadonnées supplémentaires si présentes
    if (Object.keys(extra).length > 0) {
      log += ` ${JSON.stringify(extra)}`;
    }
    
    return log;
  })
);

// Format pour les fichiers
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ═══════════════════════════════════════════════════════════════════════
// WINSTON LOGGER
// ═══════════════════════════════════════════════════════════════════════

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels.levels,
  format: fileFormat,
  transports: [
    // Fichier pour toutes les logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Fichier pour les erreurs uniquement
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Fichier pour les requêtes HTTP
    new winston.transports.File({
      filename: path.join(logsDir, 'http.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ],
  // Gestion des exceptions non catchées
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ],
  // Gestion des rejections de promesses
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Ajouter console en développement ou si explicitement demandé
if (process.env.NODE_ENV !== 'production' || process.env.LOG_TO_CONSOLE === 'true') {
  winstonLogger.add(new winston.transports.Console({
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// CLASSE LOGGER (Compatible avec votre code existant)
// ═══════════════════════════════════════════════════════════════════════

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  /**
   * Log d'information générale
   */
  info(...args) {
    const message = this.formatMessage(args);
    const metadata = this.extractMetadata(args);
    
    console.log(`[INFO] [${this.context}]`, new Date().toISOString(), ...args);
    winstonLogger.info(message, { context: this.context, ...metadata });
  }

  /**
   * Log d'avertissement
   */
  warn(...args) {
    const message = this.formatMessage(args);
    const metadata = this.extractMetadata(args);
    
    console.warn(`[WARN] [${this.context}]`, new Date().toISOString(), ...args);
    winstonLogger.warn(message, { context: this.context, ...metadata });
  }

  /**
   * Log d'erreur
   */
  error(...args) {
    const message = this.formatMessage(args);
    const metadata = this.extractMetadata(args);
    const errorObj = args.find(arg => arg instanceof Error);
    
    console.error(`[ERROR] [${this.context}]`, new Date().toISOString(), ...args);
    
    winstonLogger.error(message, { 
      context: this.context,
      ...metadata,
      ...(errorObj && {
        errorName: errorObj.name,
        errorMessage: errorObj.message,
        errorStack: errorObj.stack
      })
    });
  }

  /**
   * Log de debug (seulement en développement)
   */
  debug(...args) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const message = this.formatMessage(args);
      const metadata = this.extractMetadata(args);
      
      console.debug(`[DEBUG] [${this.context}]`, new Date().toISOString(), ...args);
      winstonLogger.debug(message, { context: this.context, ...metadata });
    }
  }

  /**
   * Log HTTP (requêtes)
   */
  http(message, metadata = {}) {
    winstonLogger.http(message, { context: this.context, ...metadata });
  }

  /**
   * Log de performance
   */
  perf(operation, duration, metadata = {}) {
    const message = `Performance: ${operation} took ${duration}ms`;
    this.info(message, { operation, duration, ...metadata });
  }

  /**
   * Log d'audit (actions utilisateur importantes)
   */
  audit(action, userId, details = {}) {
    const message = `Audit: ${action} by user ${userId}`;
    winstonLogger.info(message, {
      context: this.context,
      type: 'audit',
      action,
      userId,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log de sécurité
   */
  security(event, details = {}) {
    const message = `Security: ${event}`;
    winstonLogger.warn(message, {
      context: this.context,
      type: 'security',
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Helper pour formater les messages
   */
  formatMessage(args) {
    return args
      .filter(arg => !(arg instanceof Error) && typeof arg !== 'object')
      .map(arg => String(arg))
      .join(' ');
  }

  /**
   * Helper pour extraire les métadonnées
   */
  extractMetadata(args) {
    const metadata = {};
    args.forEach(arg => {
      if (typeof arg === 'object' && !(arg instanceof Error) && arg !== null) {
        Object.assign(metadata, arg);
      }
    });
    return metadata;
  }

  /**
   * Créer un child logger avec contexte supplémentaire
   */
  child(additionalContext) {
    return new Logger(`${this.context}:${additionalContext}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INSTANCES ET HELPERS
// ═══════════════════════════════════════════════════════════════════════

// Logger par défaut
const logger = new Logger('Ecolojia');

// Factory pour créer des loggers avec contexte
const createLogger = (context) => new Logger(context);

// Stream pour Morgan (logging HTTP)
const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Middleware Express pour logger les requêtes
const httpLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  let responseBody;

  // Intercepter la réponse
  res.send = function(data) {
    responseBody = data;
    return originalSend.apply(res, arguments);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous'
    };

    // Log différent selon le status
    if (res.statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.url} ${res.statusCode}`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.url} ${res.statusCode}`, logData);
    } else {
      logger.http(`HTTP ${req.method} ${req.url} ${res.statusCode}`, logData);
    }

    // Log de performance pour les requêtes lentes
    if (duration > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.url} took ${duration}ms`);
    }
  });

  next();
};

// Fonction pour logger le démarrage de l'application
const logStartup = () => {
  logger.info('════════════════════════════════════════════════════');
  logger.info('🚀 ECOLOJIA Backend Starting...');
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📁 Logs directory: ${logsDir}`);
  logger.info(`🔊 Log level: ${process.env.LOG_LEVEL || 'info'}`);
  logger.info('════════════════════════════════════════════════════');
};

// Fonction pour logger l'arrêt de l'application
const logShutdown = () => {
  logger.info('════════════════════════════════════════════════════');
  logger.info('🛑 ECOLOJIA Backend Shutting down...');
  logger.info('════════════════════════════════════════════════════');
};

// Fonction pour obtenir les statistiques de logs
const getLogStats = async () => {
  const stats = {};
  const logFiles = ['combined.log', 'error.log', 'http.log'];
  
  for (const file of logFiles) {
    const filePath = path.join(logsDir, file);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      stats[file] = {
        size: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
        modified: stat.mtime
      };
    }
  }
  
  return stats;
};

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  // Classes et instances
  Logger,
  logger,
  createLogger,
  
  // Middleware et helpers
  morganStream,
  httpLogger,
  
  // Fonctions utilitaires
  logStartup,
  logShutdown,
  getLogStats,
  
  // Winston pour usage avancé
  winstonLogger,
  
  // Export par défaut
  default: logger
};
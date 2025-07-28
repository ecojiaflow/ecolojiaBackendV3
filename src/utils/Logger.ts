// PATH: backend/src/utils/logger.ts
import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Configuration Winston pour logs fichiers en production
 */
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Fichier pour toutes les logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Fichier pour les erreurs uniquement
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Ajouter console en développement
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Logger compatible avec votre code existant
 * Maintient la même interface que votre Logger actuel
 */
export class Logger {
  private context: string;

  constructor(context = 'App') {
    this.context = context;
  }

  /* --- Méthodes compatibles avec votre code --- */
  info(...args: unknown[]): void {
    const message = this.formatMessage(args);
    console.log(`[${new Date().toISOString()}] INFO  [${this.context}]`, ...args);
    
    // Log aussi dans fichier
    winstonLogger.info(message, { context: this.context });
  }

  warn(...args: unknown[]): void {
    const message = this.formatMessage(args);
    console.warn(`[${new Date().toISOString()}] WARN  [${this.context}]`, ...args);
    
    // Log aussi dans fichier
    winstonLogger.warn(message, { context: this.context });
  }

  error(...args: unknown[]): void {
    const message = this.formatMessage(args);
    console.error(`[${new Date().toISOString()}] ERROR [${this.context}]`, ...args);
    
    // Log aussi dans fichier avec stack trace si c'est une Error
    const errorObj = args.find(arg => arg instanceof Error) as Error | undefined;
    winstonLogger.error(message, { 
      context: this.context,
      stack: errorObj?.stack,
      error: errorObj?.message
    });
  }

  debug(...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      const message = this.formatMessage(args);
      console.debug(`[${new Date().toISOString()}] DEBUG [${this.context}]`, ...args);
      winstonLogger.debug(message, { context: this.context });
    }
  }

  /**
   * Nouvelle méthode pour logs HTTP (compatible avec Morgan)
   */
  http(message: string): void {
    if (process.env.NODE_ENV === 'production') {
      winstonLogger.info(message, { context: this.context, type: 'http' });
    }
  }

  /**
   * Helper pour formater les messages
   */
  private formatMessage(args: unknown[]): string {
    return args
      .map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return JSON.stringify(arg);
        }
        return String(arg);
      })
      .join(' ');
  }
}

/**
 * Singleton logger par défaut (compatible avec votre code)
 */
export const logger = new Logger('Ecolojia');

/**
 * Factory pour créer des loggers avec contexte
 * (compatible avec le nouveau système)
 */
export const createLogger = (context: string) => new Logger(context);

/**
 * Stream pour Morgan HTTP logging
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

/**
 * Middleware pour logger les requêtes HTTP
 */
export const httpLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`HTTP ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });

  next();
};

/**
 * Configuration du logging au démarrage
 */
export const setupLogging = () => {
  logger.info('✅ Logging system initialized', {
    logsDirectory: logsDir,
    environment: process.env.NODE_ENV || 'development'
  });
};

/**
 * Export du logger Winston pour usage avancé
 */
export { winstonLogger };

// Compatibilité avec les imports existants
export default logger;
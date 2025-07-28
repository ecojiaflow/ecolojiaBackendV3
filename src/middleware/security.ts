// PATH: src/middleware/security.js
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');

/**
 * Configuration CORS selon l'environnement
 */
const getCorsOptions = () => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ecolojia-v3.netlify.app',
    'https://main--ecolojia-v3.netlify.app',
    'https://frontendv3.netlify.app',
    'https://ecolojiafrontv3.netlify.app'
  ];

  // Ajouter les origines depuis les variables d'environnement
  if (process.env.CORS_ORIGIN) {
    const envOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
    allowedOrigins.push(...envOrigins);
  }

  return {
    origin: (origin, callback) => {
      // Permettre les requêtes sans origine (Postman, apps mobiles)
      if (!origin) {
        return callback(null, true);
      }

      // Vérifier si l'origine est dans la liste blanche
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With'
    ],
    maxAge: 86400 // Cache preflight pendant 24h
  };
};

/**
 * Configuration Helmet pour la sécurité des headers HTTP
 */
const getHelmetOptions = () => {
  return {
    contentSecurityPolicy: false, // Désactivé pour les APIs
    crossOriginEmbedderPolicy: false
  };
};

/**
 * Headers de sécurité supplémentaires
 */
const additionalSecurityHeaders = (req, res, next) => {
  // Empêcher le clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Empêcher la détection du MIME type
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Protection XSS pour les anciens navigateurs
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Supprimer les headers qui révèlent des infos serveur
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Configuration complète de la sécurité pour l'application
 */
const setupSecurity = (app) => {
  // 1. Compression
  app.use(compression());
  
  // 2. Headers de sécurité avec Helmet
  app.use(helmet(getHelmetOptions()));
  
  // 3. CORS avec configuration stricte
  app.use(cors(getCorsOptions()));
  
  // 4. Sanitization des inputs MongoDB
  app.use(mongoSanitize());
  
  // 5. Headers de sécurité supplémentaires
  app.use(additionalSecurityHeaders);
  
  // 6. Limite de taille des requêtes
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  console.log('✅ Security middleware configured');
};

module.exports = {
  setupSecurity,
  getCorsOptions
};
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';

/**
 * Configuration du client Redis pour le rate limiting
 */
const getRedisClient = async () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL non défini - utilisation du rate limit en mémoire');
    return null;
  }

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error('❌ Impossible de se connecter à Redis après 3 tentatives');
            return null;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis connecté pour rate limiting');
    });

    await client.connect();
    return client;
    
  } catch (error) {
    console.error('❌ Erreur connexion Redis:', error);
    return null;
  }
};

/**
 * Configuration des limites par type d'endpoint
 */
export const RateLimitConfig = {
  // Limites globales
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes par fenêtre
    message: 'Trop de requêtes. Veuillez réessayer plus tard.'
  },
  
  // Auth endpoints (plus restrictifs)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives de login
    skipSuccessfulRequests: true, // Ne compte pas les logins réussis
    message: 'Trop de tentatives de connexion. Veuillez attendre 15 minutes.'
  },
  
  // API endpoints pour utilisateurs gratuits
  apiFree: {
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 30, // 30 requêtes par heure
    message: 'Limite gratuite atteinte. Passez Premium pour plus de requêtes.'
  },
  
  // API endpoints pour utilisateurs premium
  apiPremium: {
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 1000, // 1000 requêtes par heure
    message: 'Limite Premium atteinte. Contactez le support si besoin.'
  },
  
  // Analyse IA (coûteuse)
  aiAnalysis: {
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 10, // 10 analyses IA par heure (gratuit)
    message: 'Limite d\'analyses IA atteinte. Réessayez dans 1 heure.'
  },
  
  // Chat IA DeepSeek
  aiChat: {
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5, // 5 questions par heure (gratuit)
    message: 'Limite de questions IA atteinte. Passez Premium pour illimité.'
  },
  
  // Exports/Downloads
  export: {
    windowMs: 24 * 60 * 60 * 1000, // 24 heures
    max: 5, // 5 exports par jour
    message: 'Limite d\'exports atteinte. Réessayez demain.'
  }
};

/**
 * Créer un middleware de rate limiting avec configuration
 */
const createRateLimiter = async (config: any, keyPrefix: string) => {
  const redisClient = await getRedisClient();
  
  const options: any = {
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: config.message,
        retryAfter: res.getHeader('Retry-After'),
        limit: res.getHeader('X-RateLimit-Limit'),
        remaining: res.getHeader('X-RateLimit-Remaining'),
        reset: res.getHeader('X-RateLimit-Reset')
      });
    },
    skip: (req: Request) => {
      // Skip pour admin avec API key
      if (req.headers['x-admin-key'] === process.env.ADMIN_API_KEY) {
        return true;
      }
      return false;
    }
  };

  // Utiliser Redis si disponible, sinon mémoire
  if (redisClient) {
    options.store = new RedisStore({
      client: redisClient,
      prefix: `rl:${keyPrefix}:`
    });
  } else {
    console.warn(`⚠️ Rate limiter ${keyPrefix} utilise la mémoire (Redis non disponible)`);
  }

  if (config.skipSuccessfulRequests) {
    options.skipSuccessfulRequests = true;
  }

  return rateLimit(options);
};

/**
 * Middleware de rate limiting dynamique selon le tier utilisateur
 */
export const createDynamicRateLimiter = (endpoint: 'api' | 'aiAnalysis' | 'aiChat' | 'export') => {
  return async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    // Déterminer le tier de l'utilisateur
    const userTier = req.user?.tier || 'free';
    
    // Sélectionner la config selon le tier
    let config;
    let keyPrefix;
    
    switch (endpoint) {
      case 'api':
        config = userTier === 'premium' ? RateLimitConfig.apiPremium : RateLimitConfig.apiFree;
        keyPrefix = `api:${userTier}`;
        break;
        
      case 'aiAnalysis':
        if (userTier === 'premium') {
          // Premium = pas de limite sur analyses
          return next();
        }
        config = RateLimitConfig.aiAnalysis;
        keyPrefix = 'ai:analysis';
        break;
        
      case 'aiChat':
        if (userTier === 'premium') {
          // Premium = chat illimité
          return next();
        }
        config = RateLimitConfig.aiChat;
        keyPrefix = 'ai:chat';
        break;
        
      case 'export':
        config = RateLimitConfig.export;
        keyPrefix = 'export';
        break;
        
      default:
        config = RateLimitConfig.global;
        keyPrefix = 'global';
    }
    
    // Créer et appliquer le rate limiter
    const limiter = await createRateLimiter(config, keyPrefix);
    limiter(req, res, next);
  };
};

/**
 * Rate limiters pré-configurés pour usage direct
 */
let rateLimiters: any = {};

export const initializeRateLimiters = async () => {
  console.log('🔄 Initialisation des rate limiters...');
  
  try {
    rateLimiters = {
      global: await createRateLimiter(RateLimitConfig.global, 'global'),
      auth: await createRateLimiter(RateLimitConfig.auth, 'auth'),
      apiFree: await createRateLimiter(RateLimitConfig.apiFree, 'api:free'),
      apiPremium: await createRateLimiter(RateLimitConfig.apiPremium, 'api:premium'),
      aiAnalysis: await createRateLimiter(RateLimitConfig.aiAnalysis, 'ai:analysis'),
      aiChat: await createRateLimiter(RateLimitConfig.aiChat, 'ai:chat'),
      export: await createRateLimiter(RateLimitConfig.export, 'export')
    };
    
    console.log('✅ Rate limiters initialisés avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation rate limiters:', error);
    // Fallback vers limiters en mémoire
    rateLimiters = {
      global: rateLimit(RateLimitConfig.global),
      auth: rateLimit(RateLimitConfig.auth),
      apiFree: rateLimit(RateLimitConfig.apiFree),
      apiPremium: rateLimit(RateLimitConfig.apiPremium),
      aiAnalysis: rateLimit(RateLimitConfig.aiAnalysis),
      aiChat: rateLimit(RateLimitConfig.aiChat),
      export: rateLimit(RateLimitConfig.export)
    };
  }
};

// Export des rate limiters
export const globalRateLimit = () => rateLimiters.global || rateLimit(RateLimitConfig.global);
export const authRateLimit = () => rateLimiters.auth || rateLimit(RateLimitConfig.auth);
export const apiFreeRateLimit = () => rateLimiters.apiFree || rateLimit(RateLimitConfig.apiFree);
export const apiPremiumRateLimit = () => rateLimiters.apiPremium || rateLimit(RateLimitConfig.apiPremium);
export const aiAnalysisRateLimit = () => rateLimiters.aiAnalysis || rateLimit(RateLimitConfig.aiAnalysis);
export const aiChatRateLimit = () => rateLimiters.aiChat || rateLimit(RateLimitConfig.aiChat);
export const exportRateLimit = () => rateLimiters.export || rateLimit(RateLimitConfig.export);

/**
 * Middleware pour ajouter les headers de rate limit informatifs
 */
export const addRateLimitHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Ajouter des headers informatifs même sans rate limiting
  res.on('finish', () => {
    const remaining = res.getHeader('X-RateLimit-Remaining');
    const limit = res.getHeader('X-RateLimit-Limit');
    
    if (!remaining && req.user) {
      // Ajouter info quota utilisateur
      res.setHeader('X-User-Tier', req.user.tier || 'free');
      res.setHeader('X-User-Quota-Scans', req.user.quotas?.scansPerMonth || 30);
      res.setHeader('X-User-Usage-Scans', req.user.currentUsage?.scansThisMonth || 0);
    }
  });
  
  next();
};

/**
 * Reset manuel des limites pour un utilisateur (admin)
 */
export const resetUserRateLimit = async (userId: string, limiterType: string) => {
  const redisClient = await getRedisClient();
  
  if (!redisClient) {
    throw new Error('Redis non disponible pour reset');
  }
  
  const key = `rl:${limiterType}:${userId}`;
  await redisClient.del(key);
  
  return { success: true, message: `Rate limit reset pour user ${userId} sur ${limiterType}` };
};

/**
 * Monitoring des rate limits (admin)
 */
export const getRateLimitStats = async () => {
  const redisClient = await getRedisClient();
  
  if (!redisClient) {
    return { error: 'Redis non disponible' };
  }
  
  try {
    const keys = await redisClient.keys('rl:*');
    const stats: any = {};
    
    for (const key of keys) {
      const value = await redisClient.get(key);
      const [, type, identifier] = key.split(':');
      
      if (!stats[type]) {
        stats[type] = {};
      }
      
      stats[type][identifier] = parseInt(value || '0');
    }
    
    return stats;
  } catch (error) {
    return { error: 'Erreur récupération stats', details: error };
  }
};

// Types pour TypeScript
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}
// backend/src/config/redis.ts

import Redis from 'ioredis';
import { Logger } from '../utils/Logger';

const logger = new Logger('Redis');

// Utiliser l'URL Redis depuis les variables d'environnement
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Créer l'instance Redis
export const redisClient = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    if (targetErrors.includes(err.message)) {
      return true;
    }
    return false;
  }
});

// Event handlers
redisClient.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redisClient.on('error', (err) => {
  logger.error('❌ Redis connection error:', err);
});

redisClient.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});

redisClient.on('reconnecting', (delay: number) => {
  logger.info(`🔄 Redis reconnecting in ${delay}ms`);
});

// Fonction pour vérifier la connexion
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error('❌ Redis ping failed:', error);
    return false;
  }
};

// Fonction pour fermer proprement la connexion
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('✅ Redis connection closed gracefully');
  } catch (error) {
    logger.error('❌ Error closing Redis connection:', error);
  }
};

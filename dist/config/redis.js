"use strict";
// backend/src/config/redis.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnection = exports.checkRedisConnection = exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger('Redis');
// Utiliser l'URL Redis depuis les variables d'environnement
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Créer l'instance Redis
exports.redisClient = new ioredis_1.default(REDIS_URL, {
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
exports.redisClient.on('connect', () => {
    logger.info('✅ Redis connected successfully');
});
exports.redisClient.on('error', (err) => {
    logger.error('❌ Redis connection error:', err);
});
exports.redisClient.on('close', () => {
    logger.warn('⚠️ Redis connection closed');
});
exports.redisClient.on('reconnecting', (delay) => {
    logger.info(`🔄 Redis reconnecting in ${delay}ms`);
});
// Fonction pour vérifier la connexion
const checkRedisConnection = async () => {
    try {
        const pong = await exports.redisClient.ping();
        return pong === 'PONG';
    }
    catch (error) {
        logger.error('❌ Redis ping failed:', error);
        return false;
    }
};
exports.checkRedisConnection = checkRedisConnection;
// Fonction pour fermer proprement la connexion
const closeRedisConnection = async () => {
    try {
        await exports.redisClient.quit();
        logger.info('✅ Redis connection closed gracefully');
    }
    catch (error) {
        logger.error('❌ Error closing Redis connection:', error);
    }
};
exports.closeRedisConnection = closeRedisConnection;

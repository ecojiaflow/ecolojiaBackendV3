"use strict";
// backend/src/services/cache/CacheManager.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheManager = exports.CacheManager = void 0;
const redis_1 = require("../../config/redis");
const Logger_1 = require("../../utils/Logger");
const logger = new Logger_1.Logger('CacheManager');
class CacheManager {
    constructor() {
        this.defaultTTL = 3600; // 1 heure par défaut
    }
    /**
     * Récupérer une valeur du cache
     */
    async get(key) {
        try {
            const startTime = Date.now();
            const data = await redis_1.redisClient.get(key);
            if (data) {
                const duration = Date.now() - startTime;
                logger.info(`✅ Cache HIT: ${key} (${duration}ms)`);
                return JSON.parse(data);
            }
            logger.info(`❌ Cache MISS: ${key}`);
            return null;
        }
        catch (error) {
            logger.error(`❌ Cache GET error for ${key}:`, error);
            return null;
        }
    }
    /**
     * Définir une valeur dans le cache
     */
    async set(key, value, ttl) {
        try {
            const startTime = Date.now();
            const data = JSON.stringify(value);
            const expiry = ttl || this.defaultTTL;
            if (ttl && ttl > 0) {
                await redis_1.redisClient.setex(key, expiry, data);
            }
            else {
                await redis_1.redisClient.set(key, data);
            }
            const duration = Date.now() - startTime;
            logger.info(`✅ Cache SET: ${key} (TTL: ${expiry}s, ${duration}ms)`);
            return true;
        }
        catch (error) {
            logger.error(`❌ Cache SET error for ${key}:`, error);
            return false;
        }
    }
    /**
     * Supprimer une clé du cache
     */
    async delete(key) {
        try {
            const result = await redis_1.redisClient.del(key);
            logger.info(`🗑️ Cache DELETE: ${key} (${result} keys removed)`);
            return result > 0;
        }
        catch (error) {
            logger.error(`❌ Cache DELETE error for ${key}:`, error);
            return false;
        }
    }
    /**
     * Invalider toutes les clés correspondant à un pattern
     */
    async invalidate(pattern) {
        try {
            const keys = await redis_1.redisClient.keys(pattern);
            if (keys.length === 0) {
                logger.info(`🔍 No keys found for pattern: ${pattern}`);
                return 0;
            }
            const result = await redis_1.redisClient.del(...keys);
            logger.info(`🗑️ Cache INVALIDATE: ${pattern} (${result} keys removed)`);
            return result;
        }
        catch (error) {
            logger.error(`❌ Cache INVALIDATE error for ${pattern}:`, error);
            return 0;
        }
    }
    /**
     * Vérifier si une clé existe
     */
    async exists(key) {
        try {
            const result = await redis_1.redisClient.exists(key);
            return result === 1;
        }
        catch (error) {
            logger.error(`❌ Cache EXISTS error for ${key}:`, error);
            return false;
        }
    }
    /**
     * Récupérer le TTL restant d'une clé
     */
    async ttl(key) {
        try {
            const result = await redis_1.redisClient.ttl(key);
            return result;
        }
        catch (error) {
            logger.error(`❌ Cache TTL error for ${key}:`, error);
            return -1;
        }
    }
    /**
     * Récupérer ou calculer une valeur (cache-aside pattern)
     */
    async getOrSet(key, factory, ttl) {
        // Vérifier le cache d'abord
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        // Si pas en cache, calculer la valeur
        logger.info(`🔧 Computing value for: ${key}`);
        const value = await factory();
        // Stocker en cache pour les prochaines fois
        await this.set(key, value, ttl);
        return value;
    }
    /**
     * Incrémenter un compteur atomique
     */
    async increment(key, amount = 1) {
        try {
            const result = await redis_1.redisClient.incrby(key, amount);
            logger.info(`📈 Cache INCREMENT: ${key} +${amount} = ${result}`);
            return result;
        }
        catch (error) {
            logger.error(`❌ Cache INCREMENT error for ${key}:`, error);
            throw error;
        }
    }
    /**
     * Décrémenter un compteur atomique
     */
    async decrement(key, amount = 1) {
        try {
            const result = await redis_1.redisClient.decrby(key, amount);
            logger.info(`📉 Cache DECREMENT: ${key} -${amount} = ${result}`);
            return result;
        }
        catch (error) {
            logger.error(`❌ Cache DECREMENT error for ${key}:`, error);
            throw error;
        }
    }
    /**
     * Récupérer plusieurs clés en une fois
     */
    async mget(keys) {
        try {
            if (keys.length === 0)
                return [];
            const values = await redis_1.redisClient.mget(...keys);
            return values.map(v => v ? JSON.parse(v) : null);
        }
        catch (error) {
            logger.error(`❌ Cache MGET error:`, error);
            return keys.map(() => null);
        }
    }
    /**
     * Définir plusieurs clés en une fois
     */
    async mset(items) {
        try {
            const pipeline = redis_1.redisClient.pipeline();
            for (const item of items) {
                const data = JSON.stringify(item.value);
                if (item.ttl && item.ttl > 0) {
                    pipeline.setex(item.key, item.ttl, data);
                }
                else {
                    pipeline.set(item.key, data);
                }
            }
            await pipeline.exec();
            logger.info(`✅ Cache MSET: ${items.length} keys set`);
            return true;
        }
        catch (error) {
            logger.error(`❌ Cache MSET error:`, error);
            return false;
        }
    }
    /**
     * Obtenir les statistiques du cache
     */
    async getStats() {
        try {
            const info = await redis_1.redisClient.info();
            const dbsize = await redis_1.redisClient.dbsize();
            // Parser les infos Redis
            const memoryMatch = info.match(/used_memory_human:(.+)/);
            const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
            return {
                connected: true,
                totalKeys: dbsize,
                memoryUsage: memoryMatch ? memoryMatch[1].trim() : 'Unknown',
                uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : 0
            };
        }
        catch (error) {
            logger.error(`❌ Cache STATS error:`, error);
            return {
                connected: false,
                totalKeys: 0,
                memoryUsage: '0',
                uptime: 0
            };
        }
    }
    /**
     * Nettoyer toutes les clés (attention!)
     */
    async flush() {
        try {
            await redis_1.redisClient.flushdb();
            logger.warn(`⚠️ Cache FLUSH: All keys deleted!`);
            return true;
        }
        catch (error) {
            logger.error(`❌ Cache FLUSH error:`, error);
            return false;
        }
    }
}
exports.CacheManager = CacheManager;
// Export singleton
exports.cacheManager = new CacheManager();

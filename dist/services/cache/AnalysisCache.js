"use strict";
// backend/src/services/cache/AnalysisCache.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisCache = exports.AnalysisCache = void 0;
const CacheManager_1 = require("./CacheManager");
const Logger_1 = require("../../utils/Logger");
const crypto_1 = __importDefault(require("crypto"));
const logger = new Logger_1.Logger('AnalysisCache');
class AnalysisCache {
    constructor() {
        this.PREFIX = 'analysis:';
        this.BARCODE_PREFIX = 'barcode:';
        this.HASH_PREFIX = 'hash:';
        this.TTL = 86400; // 24 heures par défaut
    }
    /**
     * Générer un hash unique pour un produit
     */
    generateProductHash(productName, category, ingredients) {
        const data = {
            name: productName.toLowerCase().trim(),
            category,
            ingredients: ingredients?.sort().join(',') || ''
        };
        return crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }
    /**
     * Stocker une analyse en cache
     */
    async cacheAnalysis(analysis, ingredients) {
        try {
            const cachedAnalysis = {
                ...analysis,
                cachedAt: new Date()
            };
            // Cache par ID
            const idKey = `${this.PREFIX}${analysis.id}`;
            await CacheManager_1.cacheManager.set(idKey, cachedAnalysis, this.TTL);
            // Cache par code-barres si disponible
            if (analysis.barcode) {
                const barcodeKey = `${this.BARCODE_PREFIX}${analysis.barcode}`;
                await CacheManager_1.cacheManager.set(barcodeKey, analysis.id, this.TTL);
            }
            // Cache par hash (nom + catégorie + ingrédients)
            const hash = this.generateProductHash(analysis.productName, analysis.category, ingredients);
            const hashKey = `${this.HASH_PREFIX}${hash}`;
            await CacheManager_1.cacheManager.set(hashKey, analysis.id, this.TTL);
            logger.info(`✅ Analysis cached: ${analysis.productName} (Score: ${analysis.healthScore})`);
            return true;
        }
        catch (error) {
            logger.error(`❌ Error caching analysis:`, error);
            return false;
        }
    }
    /**
     * Récupérer une analyse par ID
     */
    async getAnalysisById(id) {
        try {
            const key = `${this.PREFIX}${id}`;
            return await CacheManager_1.cacheManager.get(key);
        }
        catch (error) {
            logger.error(`❌ Error getting analysis by ID:`, error);
            return null;
        }
    }
    /**
     * Récupérer une analyse par code-barres
     */
    async getAnalysisByBarcode(barcode) {
        try {
            // Récupérer l'ID associé au code-barres
            const barcodeKey = `${this.BARCODE_PREFIX}${barcode}`;
            const analysisId = await CacheManager_1.cacheManager.get(barcodeKey);
            if (!analysisId)
                return null;
            // Récupérer l'analyse par ID
            return await this.getAnalysisById(analysisId);
        }
        catch (error) {
            logger.error(`❌ Error getting analysis by barcode:`, error);
            return null;
        }
    }
    /**
     * Récupérer une analyse par hash produit
     */
    async getAnalysisByProduct(productName, category, ingredients) {
        try {
            // Générer le hash
            const hash = this.generateProductHash(productName, category, ingredients);
            const hashKey = `${this.HASH_PREFIX}${hash}`;
            // Récupérer l'ID associé au hash
            const analysisId = await CacheManager_1.cacheManager.get(hashKey);
            if (!analysisId) {
                logger.info(`❌ Cache MISS for product: ${productName}`);
                return null;
            }
            // Récupérer l'analyse par ID
            const analysis = await this.getAnalysisById(analysisId);
            if (analysis) {
                logger.info(`✅ Cache HIT for product: ${productName} (Score: ${analysis.healthScore})`);
            }
            return analysis;
        }
        catch (error) {
            logger.error(`❌ Error getting analysis by product:`, error);
            return null;
        }
    }
    /**
     * Vérifier si une analyse existe pour un produit
     */
    async hasAnalysis(productName, category, ingredients) {
        const analysis = await this.getAnalysisByProduct(productName, category, ingredients);
        return analysis !== null;
    }
    /**
     * Invalider une analyse
     */
    async invalidateAnalysis(id) {
        try {
            // Récupérer l'analyse pour obtenir les métadonnées
            const analysis = await this.getAnalysisById(id);
            if (!analysis)
                return false;
            // Supprimer toutes les clés associées
            const keysToDelete = [`${this.PREFIX}${id}`];
            if (analysis.barcode) {
                keysToDelete.push(`${this.BARCODE_PREFIX}${analysis.barcode}`);
            }
            // Note: Impossible de supprimer par hash sans connaître les ingrédients originaux
            // Une amélioration serait de stocker les clés associées
            for (const key of keysToDelete) {
                await CacheManager_1.cacheManager.delete(key);
            }
            logger.info(`🗑️ Analysis invalidated: ${id}`);
            return true;
        }
        catch (error) {
            logger.error(`❌ Error invalidating analysis:`, error);
            return false;
        }
    }
    /**
     * Récupérer les statistiques du cache d'analyses
     */
    async getCacheStats() {
        try {
            // Implémentation simplifiée
            // En production, utiliser des compteurs Redis pour un suivi précis
            const stats = await CacheManager_1.cacheManager.getStats();
            return {
                totalAnalyses: stats.totalKeys,
                cacheHitRate: 0, // À implémenter avec des compteurs
                averageCacheAge: 0, // À calculer
                categoriesBreakdown: {
                    food: 0,
                    cosmetics: 0,
                    detergents: 0
                }
            };
        }
        catch (error) {
            logger.error(`❌ Error getting cache stats:`, error);
            return {
                totalAnalyses: 0,
                cacheHitRate: 0,
                averageCacheAge: 0,
                categoriesBreakdown: {
                    food: 0,
                    cosmetics: 0,
                    detergents: 0
                }
            };
        }
    }
    /**
     * Réchauffer le cache avec les produits populaires
     */
    async warmupCache(popularProducts) {
        try {
            let warmedCount = 0;
            for (const product of popularProducts) {
                const exists = await this.hasAnalysis(product.name, product.category);
                if (!exists) {
                    // Ici, déclencher une analyse pour réchauffer le cache
                    // À implémenter selon votre logique métier
                    logger.info(`📥 Should warm cache for: ${product.name}`);
                }
                else {
                    warmedCount++;
                }
            }
            logger.info(`🔥 Cache warmup: ${warmedCount}/${popularProducts.length} already cached`);
            return warmedCount;
        }
        catch (error) {
            logger.error(`❌ Error warming up cache:`, error);
            return 0;
        }
    }
    /**
     * Nettoyer les analyses expirées
     */
    async cleanupExpired() {
        try {
            // Redis supprime automatiquement les clés expirées
            // Cette méthode peut être utilisée pour un nettoyage manuel si nécessaire
            const pattern = `${this.PREFIX}*`;
            const deleted = await CacheManager_1.cacheManager.invalidate(pattern);
            logger.info(`🧹 Cleaned up ${deleted} expired analyses`);
            return deleted;
        }
        catch (error) {
            logger.error(`❌ Error cleaning up analyses:`, error);
            return 0;
        }
    }
}
exports.AnalysisCache = AnalysisCache;
// Export singleton
exports.analysisCache = new AnalysisCache();

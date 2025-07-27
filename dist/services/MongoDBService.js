"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoDBService = exports.MongoDBService = void 0;
// PATH: backend/src/services/MongoDBService.ts
const User_1 = require("../models/User");
const AnalysisCache_1 = require("../models/AnalysisCache");
const ChatHistory_1 = require("../models/ChatHistory");
const UserAnalytics_1 = require("../models/UserAnalytics");
const crypto_1 = __importDefault(require("crypto"));
class MongoDBService {
    // === USER MANAGEMENT ===
    /**
     * Met à jour un utilisateur après paiement Lemon Squeezy
     */
    async updateUserToPremium(lemonSqueezyData) {
        try {
            const user = await User_1.User.findOneAndUpdate({ email: lemonSqueezyData.userEmail }, {
                tier: 'premium',
                lemonSqueezyCustomerId: lemonSqueezyData.customerId,
                lemonSqueezySubscriptionId: lemonSqueezyData.subscriptionId,
                subscriptionStatus: lemonSqueezyData.status,
                subscriptionStartDate: new Date(),
                // Quotas Premium
                quotas: {
                    analyses: -1, // Illimité
                    aiQuestions: -1, // Illimité
                    exports: 10, // 10/mois
                    apiCalls: 1000 // 1000/mois
                }
            }, { new: true });
            if (user) {
                // Enregistrer l'événement dans UserAnalytics
                await this.recordAnalyticsEvent((user.id || user._id?.toString() || ""), 'premium_upgrade', {
                    subscriptionId: lemonSqueezyData.subscriptionId,
                    plan: 'premium'
                });
            }
            return user;
        }
        catch (error) {
            console.error('Error updating user to premium:', error);
            throw error;
        }
    }
    /**
     * Annule l'abonnement d'un utilisateur
     */
    async cancelUserSubscription(subscriptionId) {
        try {
            const user = await User_1.User.findOneAndUpdate({ lemonSqueezySubscriptionId: subscriptionId }, {
                tier: 'free',
                subscriptionStatus: 'cancelled',
                subscriptionCancelledAt: new Date(),
                // Retour aux quotas gratuits
                quotas: {
                    analyses: 30,
                    aiQuestions: 0,
                    exports: 0,
                    apiCalls: 0
                }
            }, { new: true });
            return user;
        }
        catch (error) {
            console.error('Error cancelling subscription:', error);
            throw error;
        }
    }
    // === QUOTA MANAGEMENT ===
    /**
     * Vérifie si un utilisateur a encore du quota
     */
    async checkUserQuota(userId, quotaType) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            const allowed = user.checkQuota(quotaType);
            const quota = user.quotas[quotaType];
            const usage = user.usage[quotaType];
            const remaining = quota === -1 ? -1 : Math.max(0, quota - usage);
            // Date de reset (1er du mois prochain)
            const resetDate = new Date();
            resetDate.setMonth(resetDate.getMonth() + 1);
            resetDate.setDate(1);
            resetDate.setHours(0, 0, 0, 0);
            return {
                allowed,
                remaining,
                resetDate
            };
        }
        catch (error) {
            console.error('Error checking quota:', error);
            throw error;
        }
    }
    /**
     * Incrémente l'usage d'un quota
     */
    async incrementUsage(userId, usageType) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            await user.incrementUsage(usageType);
            // Enregistrer dans analytics
            await this.recordAnalyticsEvent(userId, usageType.replace(/s$/, ''), {
                quota: user.quotas[usageType],
                usage: user.usage[usageType]
            });
        }
        catch (error) {
            console.error('Error incrementing usage:', error);
            throw error;
        }
    }
    // === ANALYSIS CACHE ===
    /**
     * Recherche une analyse en cache
     */
    async getCachedAnalysis(productData) {
        try {
            const hash = this.generateProductHash(productData);
            const cached = await AnalysisCache_1.AnalysisCache.findOne({ productHash: hash });
            if (cached) {
                // Vérifier si le cache est encore valide
                const now = new Date();
                if (cached.ttl > now) {
                    // Incrémenter le hit count
                    cached.metadata.hitCount += 1;
                    cached.metadata.lastAccessed = new Date();
                    await cached.save();
                    return cached.cachedAnalysis;
                }
            }
            return null;
        }
        catch (error) {
            console.error('Error getting cached analysis:', error);
            return null;
        }
    }
    /**
     * Sauvegarde une analyse en cache
     */
    async cacheAnalysis(productData, analysis) {
        try {
            const hash = this.generateProductHash(productData);
            await AnalysisCache_1.AnalysisCache.findOneAndUpdate({ productHash: hash }, {
                productHash: hash,
                barcode: productData.barcode,
                category: productData.category,
                productName: productData.name,
                brand: productData.brand,
                cachedAnalysis: {
                    internalAI: analysis,
                    healthScore: analysis.healthScore || 0,
                    novaScore: analysis.novaScore,
                    recommendations: analysis.recommendations || [],
                    lastUpdated: new Date()
                },
                ttl: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
            }, { upsert: true, new: true });
        }
        catch (error) {
            console.error('Error caching analysis:', error);
        }
    }
    // === CHAT HISTORY ===
    /**
     * Crée une nouvelle session de chat
     */
    async createChatSession(userId, productId, isPremium = false) {
        try {
            const session = await ChatHistory_1.ChatHistory.create({
                userId,
                productId,
                metadata: {
                    isPremiumSession: isPremium
                }
            });
            return session.sessionId;
        }
        catch (error) {
            console.error('Error creating chat session:', error);
            throw error;
        }
    }
    /**
     * Ajoute un message à une session de chat
     */
    async addChatMessage(sessionId, message) {
        try {
            const session = await ChatHistory_1.ChatHistory.findOne({ sessionId });
            if (!session) {
                throw new Error('Chat session not found');
            }
            await session.addMessage({
                ...message,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error('Error adding chat message:', error);
            throw error;
        }
    }
    // === ANALYTICS ===
    /**
     * Enregistre un événement analytics
     */
    async recordAnalyticsEvent(userId, eventType, metadata) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            await UserAnalytics_1.UserAnalytics.findOneAndUpdate({ userId, date: today }, {
                $inc: { [`daily.${eventType}s`]: 1 },
                $push: {
                    events: {
                        type: eventType,
                        timestamp: new Date(),
                        metadata
                    }
                }
            }, { upsert: true, new: true });
        }
        catch (error) {
            console.error('Error recording analytics event:', error);
        }
    }
    /**
     * Récupère les analytics d'un utilisateur
     */
    async getUserAnalytics(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const analytics = await UserAnalytics_1.UserAnalytics.find({
                userId,
                date: { $gte: startDate }
            }).sort({ date: -1 });
            // Calculer les métriques agrégées
            const totalScans = analytics.reduce((sum, day) => sum + day.daily.scans, 0);
            const totalAIQuestions = analytics.reduce((sum, day) => sum + day.daily.aiQuestions, 0);
            const avgHealthScore = analytics.reduce((sum, day) => sum + day.daily.averageHealthScore, 0) / analytics.length || 0;
            return {
                period: { start: startDate, end: new Date() },
                totalScans,
                totalAIQuestions,
                averageHealthScore: Math.round(avgHealthScore),
                dailyData: analytics,
                insights: analytics[0]?.insights || {}
            };
        }
        catch (error) {
            console.error('Error getting user analytics:', error);
            throw error;
        }
    }
    // === UTILITIES ===
    /**
     * Génère un hash unique pour un produit
     */
    generateProductHash(productData) {
        const content = JSON.stringify({
            barcode: productData.barcode,
            ingredients: productData.ingredients,
            category: productData.category
        });
        return crypto_1.default.createHash('md5').update(content).digest('hex');
    }
    /**
     * Nettoie les anciennes données (job de maintenance)
     */
    async cleanupOldData() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            // Nettoyer les vieilles sessions de chat terminées
            await ChatHistory_1.ChatHistory.deleteMany({
                status: 'completed',
                endedAt: { $lt: thirtyDaysAgo }
            });
            console.log('✅ Old data cleanup completed');
        }
        catch (error) {
            console.error('Error cleaning up old data:', error);
        }
    }
}
exports.MongoDBService = MongoDBService;
// Export singleton
exports.mongoDBService = new MongoDBService();

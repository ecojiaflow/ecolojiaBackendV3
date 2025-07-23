"use strict";
// backend/src/services/cache/SessionCache.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionCache = exports.SessionCache = void 0;
const CacheManager_1 = require("./CacheManager");
const Logger_1 = require("../../utils/Logger");
const logger = new Logger_1.Logger('SessionCache');
class SessionCache {
    constructor() {
        this.PREFIX = 'session:';
        this.USER_SESSIONS_PREFIX = 'user_sessions:';
        this.TTL = 86400; // 24 heures
    }
    /**
     * Créer une nouvelle session en cache
     */
    async createSession(token, user) {
        try {
            const sessionData = {
                userId: user.id,
                user,
                isActive: true,
                lastAccess: new Date(),
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + this.TTL * 1000)
            };
            // Stocker la session
            const success = await CacheManager_1.cacheManager.set(`${this.PREFIX}${token}`, sessionData, this.TTL);
            if (success) {
                // Ajouter le token à la liste des sessions de l'utilisateur
                await this.addUserSession(user.id, token);
                logger.info(`✅ Session created for user ${user.email}`);
            }
            return success;
        }
        catch (error) {
            logger.error(`❌ Error creating session:`, error);
            return false;
        }
    }
    /**
     * Récupérer une session du cache
     */
    async getSession(token) {
        try {
            const session = await CacheManager_1.cacheManager.get(`${this.PREFIX}${token}`);
            if (session) {
                // Mettre à jour le lastAccess
                session.lastAccess = new Date();
                await CacheManager_1.cacheManager.set(`${this.PREFIX}${token}`, session, this.TTL);
            }
            return session;
        }
        catch (error) {
            logger.error(`❌ Error getting session:`, error);
            return null;
        }
    }
    /**
     * Vérifier si une session est valide
     */
    async isSessionValid(token) {
        const session = await this.getSession(token);
        if (!session)
            return false;
        return session.isActive &&
            new Date() < new Date(session.expiresAt);
    }
    /**
     * Invalider une session
     */
    async invalidateSession(token) {
        try {
            const session = await this.getSession(token);
            if (session) {
                // Retirer de la liste des sessions utilisateur
                await this.removeUserSession(session.userId, token);
                // Supprimer la session
                return await CacheManager_1.cacheManager.delete(`${this.PREFIX}${token}`);
            }
            return false;
        }
        catch (error) {
            logger.error(`❌ Error invalidating session:`, error);
            return false;
        }
    }
    /**
     * Invalider toutes les sessions d'un utilisateur
     */
    async invalidateUserSessions(userId) {
        try {
            const tokens = await this.getUserSessions(userId);
            let count = 0;
            for (const token of tokens) {
                if (await this.invalidateSession(token)) {
                    count++;
                }
            }
            logger.info(`🗑️ Invalidated ${count} sessions for user ${userId}`);
            return count;
        }
        catch (error) {
            logger.error(`❌ Error invalidating user sessions:`, error);
            return 0;
        }
    }
    /**
     * Mettre à jour les données utilisateur dans toutes ses sessions
     */
    async updateUserInSessions(userId, updatedUser) {
        try {
            const tokens = await this.getUserSessions(userId);
            for (const token of tokens) {
                const session = await this.getSession(token);
                if (session) {
                    session.user = { ...session.user, ...updatedUser };
                    await CacheManager_1.cacheManager.set(`${this.PREFIX}${token}`, session, await CacheManager_1.cacheManager.ttl(`${this.PREFIX}${token}`));
                }
            }
            logger.info(`✅ Updated user data in ${tokens.length} sessions`);
        }
        catch (error) {
            logger.error(`❌ Error updating user in sessions:`, error);
        }
    }
    /**
     * Obtenir la liste des sessions d'un utilisateur
     */
    async getUserSessions(userId) {
        try {
            const tokens = await CacheManager_1.cacheManager.get(`${this.USER_SESSIONS_PREFIX}${userId}`);
            return tokens || [];
        }
        catch (error) {
            logger.error(`❌ Error getting user sessions:`, error);
            return [];
        }
    }
    /**
     * Ajouter un token à la liste des sessions utilisateur
     */
    async addUserSession(userId, token) {
        try {
            const tokens = await this.getUserSessions(userId);
            if (!tokens.includes(token)) {
                tokens.push(token);
                await CacheManager_1.cacheManager.set(`${this.USER_SESSIONS_PREFIX}${userId}`, tokens, this.TTL);
            }
        }
        catch (error) {
            logger.error(`❌ Error adding user session:`, error);
        }
    }
    /**
     * Retirer un token de la liste des sessions utilisateur
     */
    async removeUserSession(userId, token) {
        try {
            const tokens = await this.getUserSessions(userId);
            const filtered = tokens.filter(t => t !== token);
            if (filtered.length > 0) {
                await CacheManager_1.cacheManager.set(`${this.USER_SESSIONS_PREFIX}${userId}`, filtered, this.TTL);
            }
            else {
                await CacheManager_1.cacheManager.delete(`${this.USER_SESSIONS_PREFIX}${userId}`);
            }
        }
        catch (error) {
            logger.error(`❌ Error removing user session:`, error);
        }
    }
    /**
     * Nettoyer les sessions expirées
     */
    async cleanupExpiredSessions() {
        try {
            const keys = await CacheManager_1.cacheManager.invalidate(`${this.PREFIX}*`);
            logger.info(`🧹 Cleaned up expired sessions`);
            return keys;
        }
        catch (error) {
            logger.error(`❌ Error cleaning up sessions:`, error);
            return 0;
        }
    }
    /**
     * Obtenir les statistiques des sessions
     */
    async getSessionStats() {
        try {
            // Implémentation simplifiée - peut être améliorée
            const pattern = `${this.PREFIX}*`;
            const keys = await CacheManager_1.cacheManager.invalidate(pattern);
            return {
                totalSessions: keys,
                activeSessions: keys, // Approximation
                uniqueUsers: 0 // À implémenter si nécessaire
            };
        }
        catch (error) {
            logger.error(`❌ Error getting session stats:`, error);
            return {
                totalSessions: 0,
                activeSessions: 0,
                uniqueUsers: 0
            };
        }
    }
}
exports.SessionCache = SessionCache;
// Export singleton
exports.sessionCache = new SessionCache();

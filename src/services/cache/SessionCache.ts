// backend/src/services/cache/SessionCache.ts

import { cacheManager } from './CacheManager';
import { User } from '../../types/user.types';
import { Logger } from '../../utils/Logger';

const logger = new Logger('SessionCache');

interface SessionData {
  userId: string;
  user: User;
  isActive: boolean;
  lastAccess: Date;
  createdAt: Date;
  expiresAt: Date;
}

export class SessionCache {
  private readonly PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly TTL = 86400; // 24 heures

  /**
   * Créer une nouvelle session en cache
   */
  async createSession(token: string, user: User): Promise<boolean> {
    try {
      const sessionData: SessionData = {
        userId: user.id,
        user,
        isActive: true,
        lastAccess: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.TTL * 1000)
      };

      // Stocker la session
      const success = await cacheManager.set(
        `${this.PREFIX}${token}`,
        sessionData,
        this.TTL
      );

      if (success) {
        // Ajouter le token à la liste des sessions de l'utilisateur
        await this.addUserSession(user.id, token);
        logger.info(`✅ Session created for user ${user.email}`);
      }

      return success;
    } catch (error) {
      logger.error(`❌ Error creating session:`, error);
      return false;
    }
  }

  /**
   * Récupérer une session du cache
   */
  async getSession(token: string): Promise<SessionData | null> {
    try {
      const session = await cacheManager.get<SessionData>(
        `${this.PREFIX}${token}`
      );

      if (session) {
        // Mettre à jour le lastAccess
        session.lastAccess = new Date();
        await cacheManager.set(
          `${this.PREFIX}${token}`,
          session,
          this.TTL
        );
      }

      return session;
    } catch (error) {
      logger.error(`❌ Error getting session:`, error);
      return null;
    }
  }

  /**
   * Vérifier si une session est valide
   */
  async isSessionValid(token: string): Promise<boolean> {
    const session = await this.getSession(token);
    
    if (!session) return false;
    
    return session.isActive && 
           new Date() < new Date(session.expiresAt);
  }

  /**
   * Invalider une session
   */
  async invalidateSession(token: string): Promise<boolean> {
    try {
      const session = await this.getSession(token);
      
      if (session) {
        // Retirer de la liste des sessions utilisateur
        await this.removeUserSession(session.userId, token);
        
        // Supprimer la session
        return await cacheManager.delete(`${this.PREFIX}${token}`);
      }
      
      return false;
    } catch (error) {
      logger.error(`❌ Error invalidating session:`, error);
      return false;
    }
  }

  /**
   * Invalider toutes les sessions d'un utilisateur
   */
  async invalidateUserSessions(userId: string): Promise<number> {
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
    } catch (error) {
      logger.error(`❌ Error invalidating user sessions:`, error);
      return 0;
    }
  }

  /**
   * Mettre à jour les données utilisateur dans toutes ses sessions
   */
  async updateUserInSessions(userId: string, updatedUser: Partial<User>): Promise<void> {
    try {
      const tokens = await this.getUserSessions(userId);

      for (const token of tokens) {
        const session = await this.getSession(token);
        
        if (session) {
          session.user = { ...session.user, ...updatedUser };
          await cacheManager.set(
            `${this.PREFIX}${token}`,
            session,
            await cacheManager.ttl(`${this.PREFIX}${token}`)
          );
        }
      }

      logger.info(`✅ Updated user data in ${tokens.length} sessions`);
    } catch (error) {
      logger.error(`❌ Error updating user in sessions:`, error);
    }
  }

  /**
   * Obtenir la liste des sessions d'un utilisateur
   */
  private async getUserSessions(userId: string): Promise<string[]> {
    try {
      const tokens = await cacheManager.get<string[]>(
        `${this.USER_SESSIONS_PREFIX}${userId}`
      );
      return tokens || [];
    } catch (error) {
      logger.error(`❌ Error getting user sessions:`, error);
      return [];
    }
  }

  /**
   * Ajouter un token à la liste des sessions utilisateur
   */
  private async addUserSession(userId: string, token: string): Promise<void> {
    try {
      const tokens = await this.getUserSessions(userId);
      
      if (!tokens.includes(token)) {
        tokens.push(token);
        await cacheManager.set(
          `${this.USER_SESSIONS_PREFIX}${userId}`,
          tokens,
          this.TTL
        );
      }
    } catch (error) {
      logger.error(`❌ Error adding user session:`, error);
    }
  }

  /**
   * Retirer un token de la liste des sessions utilisateur
   */
  private async removeUserSession(userId: string, token: string): Promise<void> {
    try {
      const tokens = await this.getUserSessions(userId);
      const filtered = tokens.filter(t => t !== token);
      
      if (filtered.length > 0) {
        await cacheManager.set(
          `${this.USER_SESSIONS_PREFIX}${userId}`,
          filtered,
          this.TTL
        );
      } else {
        await cacheManager.delete(`${this.USER_SESSIONS_PREFIX}${userId}`);
      }
    } catch (error) {
      logger.error(`❌ Error removing user session:`, error);
    }
  }

  /**
   * Nettoyer les sessions expirées
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const keys = await cacheManager.invalidate(`${this.PREFIX}*`);
      logger.info(`🧹 Cleaned up expired sessions`);
      return keys;
    } catch (error) {
      logger.error(`❌ Error cleaning up sessions:`, error);
      return 0;
    }
  }

  /**
   * Obtenir les statistiques des sessions
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    uniqueUsers: number;
  }> {
    try {
      // Implémentation simplifiée - peut être améliorée
      const pattern = `${this.PREFIX}*`;
      const keys = await cacheManager.invalidate(pattern);
      
      return {
        totalSessions: keys,
        activeSessions: keys, // Approximation
        uniqueUsers: 0 // À implémenter si nécessaire
      };
    } catch (error) {
      logger.error(`❌ Error getting session stats:`, error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        uniqueUsers: 0
      };
    }
  }
}

// Export singleton
export const sessionCache = new SessionCache();
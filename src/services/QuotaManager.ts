// backend/src/services/QuotaManager.ts

import { cacheManager } from './cache/CacheManager';
import { Logger } from '../utils/Logger';

const logger = new Logger('QuotaManager');

interface QuotaConfig {
  free: {
    scansPerMonth: number;
    aiQuestionsPerDay: number;
    aiQuestionsPerMonth: number;
    exportsPerMonth: number;
    apiCallsPerMonth: number;
  };
  premium: {
    scansPerMonth: number;
    aiQuestionsPerDay: number;
    aiQuestionsPerMonth: number;
    exportsPerMonth: number;
    apiCallsPerMonth: number;
  };
}

export class QuotaManager {
  private readonly QUOTA_PREFIX = 'quota:';
  private readonly USAGE_PREFIX = 'usage:';
  
  private readonly config: QuotaConfig = {
    free: {
      scansPerMonth: 25,
      aiQuestionsPerDay: 0,
      aiQuestionsPerMonth: 0,
      exportsPerMonth: 0,
      apiCallsPerMonth: 0
    },
    premium: {
      scansPerMonth: -1, // Illimité
      aiQuestionsPerDay: -1, // Illimité
      aiQuestionsPerMonth: -1, // Illimité
      exportsPerMonth: 10,
      apiCallsPerMonth: 1000
    }
  };

  /**
   * Vérifier si l'utilisateur peut effectuer une action
   */
  async checkQuota(
    userId: string,
    tier: 'free' | 'premium',
    action: 'scan' | 'aiQuestion' | 'export' | 'apiCall'
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    try {
      const quotaKey = this.getQuotaKey(action);
      const limit = this.config[tier][quotaKey as keyof typeof this.config.free];
      
      // Si illimité (-1), toujours autoriser
      if (limit === -1) {
        return { allowed: true, remaining: -1, limit: -1 };
      }

      // Récupérer l'usage actuel
      const usage = await this.getUsage(userId, action);
      const remaining = Math.max(0, limit - usage);
      
      return {
        allowed: usage < limit,
        remaining,
        limit
      };
    } catch (error) {
      logger.error(`❌ Error checking quota:`, error);
      return { allowed: false, remaining: 0, limit: 0 };
    }
  }

  /**
   * Incrémenter l'usage d'un quota
   */
  async incrementUsage(
    userId: string,
    action: 'scan' | 'aiQuestion' | 'export' | 'apiCall'
  ): Promise<number> {
    try {
      const key = this.getUsageKey(userId, action);
      const ttl = this.getTTL(action);
      
      // Incrémenter atomiquement
      const newUsage = await cacheManager.increment(key, 1);
      
      // Définir l'expiration si c'est le premier usage
      if (newUsage === 1) {
        await cacheManager.set(key, newUsage, ttl);
      }
      
      logger.info(`📈 Quota usage incremented: User ${userId}, Action ${action}, New usage: ${newUsage}`);
      return newUsage;
    } catch (error) {
      logger.error(`❌ Error incrementing usage:`, error);
      throw error;
    }
  }

  /**
   * Récupérer l'usage actuel
   */
  async getUsage(
    userId: string,
    action: 'scan' | 'aiQuestion' | 'export' | 'apiCall'
  ): Promise<number> {
    try {
      const key = this.getUsageKey(userId, action);
      const usage = await cacheManager.get<number>(key);
      return usage || 0;
    } catch (error) {
      logger.error(`❌ Error getting usage:`, error);
      return 0;
    }
  }

  /**
   * Récupérer tous les quotas et usages d'un utilisateur
   */
  async getUserQuotaStatus(
    userId: string,
    tier: 'free' | 'premium'
  ): Promise<{
    scans: { used: number; limit: number; remaining: number };
    aiQuestions: { used: number; limit: number; remaining: number };
    exports: { used: number; limit: number; remaining: number };
    apiCalls: { used: number; limit: number; remaining: number };
  }> {
    try {
      const [scansUsage, aiQuestionsUsage, exportsUsage, apiCallsUsage] = await Promise.all([
        this.getUsage(userId, 'scan'),
        this.getUsage(userId, 'aiQuestion'),
        this.getUsage(userId, 'export'),
        this.getUsage(userId, 'apiCall')
      ]);

      const quotas = this.config[tier];

      return {
        scans: {
          used: scansUsage,
          limit: quotas.scansPerMonth,
          remaining: quotas.scansPerMonth === -1 ? -1 : Math.max(0, quotas.scansPerMonth - scansUsage)
        },
        aiQuestions: {
          used: aiQuestionsUsage,
          limit: quotas.aiQuestionsPerDay,
          remaining: quotas.aiQuestionsPerDay === -1 ? -1 : Math.max(0, quotas.aiQuestionsPerDay - aiQuestionsUsage)
        },
        exports: {
          used: exportsUsage,
          limit: quotas.exportsPerMonth,
          remaining: quotas.exportsPerMonth === -1 ? -1 : Math.max(0, quotas.exportsPerMonth - exportsUsage)
        },
        apiCalls: {
          used: apiCallsUsage,
          limit: quotas.apiCallsPerMonth,
          remaining: quotas.apiCallsPerMonth === -1 ? -1 : Math.max(0, quotas.apiCallsPerMonth - apiCallsUsage)
        }
      };
    } catch (error) {
      logger.error(`❌ Error getting user quota status:`, error);
      throw error;
    }
  }

  /**
   * Réinitialiser un quota spécifique (admin only)
   */
  async resetQuota(
    userId: string,
    action: 'scan' | 'aiQuestion' | 'export' | 'apiCall'
  ): Promise<boolean> {
    try {
      const key = this.getUsageKey(userId, action);
      const deleted = await cacheManager.delete(key);
      
      logger.info(`🔄 Quota reset: User ${userId}, Action ${action}`);
      return deleted;
    } catch (error) {
      logger.error(`❌ Error resetting quota:`, error);
      return false;
    }
  }

  /**
   * Bonus de quota (pour promotions, etc.)
   */
  async addBonus(
    userId: string,
    action: 'scan' | 'aiQuestion' | 'export' | 'apiCall',
    amount: number
  ): Promise<number> {
    try {
      const key = this.getUsageKey(userId, action);
      const currentUsage = await this.getUsage(userId, action);
      const newUsage = Math.max(0, currentUsage - amount);
      
      await cacheManager.set(key, newUsage, this.getTTL(action));
      
      logger.info(`🎁 Quota bonus added: User ${userId}, Action ${action}, Bonus: ${amount}`);
      return newUsage;
    } catch (error) {
      logger.error(`❌ Error adding bonus:`, error);
      throw error;
    }
  }

  /**
   * Middleware Express pour vérifier les quotas
   */
  createQuotaMiddleware(action: 'scan' | 'aiQuestion' | 'export' | 'apiCall') {
    return async (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      const { allowed, remaining, limit } = await this.checkQuota(
        req.user.id,
        req.user.tier,
        action
      );

      if (!allowed) {
        return res.status(429).json({
          success: false,
          message: 'Quota dépassé',
          quota: {
            action,
            limit,
            remaining: 0,
            resetIn: this.getResetTime(action)
          }
        });
      }

      // Ajouter les infos de quota à la requête
      req.quota = { action, remaining, limit };
      
      // Incrémenter après succès de l'action
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await this.incrementUsage(req.user.id, action);
        }
      });

      next();
    };
  }

  /**
   * Obtenir la clé de quota selon l'action
   */
  private getQuotaKey(action: string): string {
    const mapping: Record<string, string> = {
      scan: 'scansPerMonth',
      aiQuestion: 'aiQuestionsPerDay',
      export: 'exportsPerMonth',
      apiCall: 'apiCallsPerMonth'
    };
    return mapping[action] || 'scansPerMonth';
  }

  /**
   * Obtenir la clé d'usage Redis
   */
  private getUsageKey(userId: string, action: string): string {
    const period = this.getPeriod(action);
    return `${this.USAGE_PREFIX}${userId}:${action}:${period}`;
  }

  /**
   * Obtenir la période pour la clé
   */
  private getPeriod(action: string): string {
    const now = new Date();
    
    if (action === 'aiQuestion') {
      // Quotas journaliers
      return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    } else {
      // Quotas mensuels
      return `${now.getFullYear()}-${now.getMonth() + 1}`;
    }
  }

  /**
   * Obtenir le TTL selon l'action
   */
  private getTTL(action: string): number {
    if (action === 'aiQuestion') {
      // 24 heures pour les quotas journaliers
      return 86400;
    } else {
      // 31 jours pour les quotas mensuels
      return 2678400;
    }
  }

  /**
   * Obtenir le temps avant reset
   */
  private getResetTime(action: string): string {
    const now = new Date();
    
    if (action === 'aiQuestion') {
      // Reset à minuit
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const hours = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
      return `${hours} heures`;
    } else {
      // Reset le 1er du mois
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const days = Math.floor((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} jours`;
    }
  }
}

// Export singleton
export const quotaManager = new QuotaManager();
// PATH: src/services/QuotaManager.ts
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';
import { cacheManager } from './cache/CacheManager';

const logger = new Logger('QuotaManager');

type QuotaType = 'scan' | 'aiQuestion';

const DEFAULT_QUOTAS = {
  free: {
    scan: 30,
    aiQuestion: 10
  },
  premium: {
    scan: 9999,
    aiQuestion: 9999
  }
};

// Interface pour étendre Request avec quota
declare global {
  namespace Express {
    interface Request {
      quota?: {
        used: number;
        max: number;
      };
    }
  }
}

class QuotaManager {
  async getUsage(userId: string, type: QuotaType): Promise<number> {
    const key = this.getKey(userId, type);
    const val = await cacheManager.get(key);
    return typeof val === 'number' ? val : 0;
  }

  async incrementUsage(userId: string, type: QuotaType): Promise<void> {
    const key = this.getKey(userId, type);
    // ✅ FIX: increment accepte seulement un nombre
    const newValue = await cacheManager.increment(key, 1);
    
    // Si vous voulez définir un TTL, utilisez expire séparément
    if (newValue === 1) { // Premier increment
      // TTL handled in set/increment // 30 jours
    }
  }

  async resetUsage(userId: string): Promise<void> {
    const keys = Object.keys(DEFAULT_QUOTAS.free).map((type) =>
      this.getKey(userId, type as QuotaType)
    );
    for (const key of keys) {
      // ✅ FIX: utiliser del au lieu de remove
      await cacheManager.delete(key);
    }
  }

  /** Retourne l'état de quota actuel */
  async getUserQuotaStatus(userId: string): Promise<
    { action: string; remaining: number; limit: number }[]
  > {
    const tier = 'free'; // à remplacer si tu lis depuis Mongo
    const types = Object.keys(DEFAULT_QUOTAS[tier]) as QuotaType[];

    const status = await Promise.all(
      types.map(async (type) => {
        const limit = DEFAULT_QUOTAS[tier][type];
        const used = await this.getUsage(userId, type);
        return {
          action: type,
          remaining: Math.max(0, limit - used),
          limit
          // ✅ FIX: Removed 'used' property as it's not in the return type
        };
      })
    );

    return status;
  }

  createQuotaMiddleware(type: QuotaType) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        const tier = req.user?.tier || 'free';

        // Si pas d'utilisateur connecté
        if (!userId) {
          logger.warn('Tentative d\'accès sans authentification');
          return res.status(401).json({
            success: false,
            message: 'Authentification requise'
          });
        }

        // Bypass dev
        if (process.env.NODE_ENV === 'development') {
          logger.info(`[DEV] Quota désactivé pour ${type}`);
          return next();
        }

        const allowed = DEFAULT_QUOTAS[tier as keyof typeof DEFAULT_QUOTAS]?.[type] || 0;
        const current = await this.getUsage(userId, type);

        if (current >= allowed) {
          logger.warn(`❌ Quota ${type} dépassé : ${current}/${allowed}`);
          return res.status(429).json({
            success: false,
            message: `Quota ${type} dépassé.`,
            quota: { used: current, max: allowed }
          });
        }

        await this.incrementUsage(userId, type);

        // Ajouter les infos de quota à la requête
        req.quota = {
          used: current + 1,
          max: allowed
        };

        next();
      } catch (err) {
        logger.error('Erreur middleware quota', err);
        res.status(500).json({ success: false, message: 'Erreur quota' });
      }
    };
  }

  private getKey(userId: string, type: QuotaType): string {
    return `quota:${userId}:${type}`;
  }
}

export const quotaManager = new QuotaManager();
// EOF


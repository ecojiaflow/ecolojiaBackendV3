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

class QuotaManager {
  async getUsage(userId: string, type: QuotaType): Promise<number> {
    const key = this.getKey(userId, type);
    const val = await cacheManager.get(key);
    return typeof val === 'number' ? val : 0;
  }

  async incrementUsage(userId: string, type: QuotaType): Promise<void> {
    const key = this.getKey(userId, type);
    await cacheManager.increment(key, 1, 3600 * 24 * 30); // quota mensuel
  }

  async resetUsage(userId: string): Promise<void> {
    const keys = Object.values(DEFAULT_QUOTAS.free).map((_, i) =>
      this.getKey(userId, Object.keys(DEFAULT_QUOTAS.free)[i] as QuotaType)
    );
    await Promise.all(keys.map((k) => cacheManager.del(k)));
  }

  createQuotaMiddleware(type: QuotaType) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        const tier = req.user?.tier || 'free';

        // Bypass en dev si besoin :
        if (process.env.NODE_ENV === 'development') {
          logger.info(`[DEV] Quota désactivé pour ${type}`);
          return next();
        }

        const allowed = DEFAULT_QUOTAS[tier][type] || 0;
        const current = await this.getUsage(userId, type);

        if (current >= allowed) {
          logger.warn(`❌ Quota dépassé [${type}] : ${current}/${allowed} (user=${userId})`);
          return res.status(429).json({
            success: false,
            message: `Quota mensuel ${type} dépassé. Limite atteinte.`,
            quota: { allowed, used: current }
          });
        }

        // Suivi en temps réel
        await this.incrementUsage(userId, type);
        req.quota = { type, used: current + 1, max: allowed };

        next();
      } catch (error) {
        logger.error(`Erreur quota middleware [${type}]`, error);
        return res.status(500).json({ success: false, message: 'Erreur quota' });
      }
    };
  }

  private getKey(userId: string, type: QuotaType) {
    return `quota:${userId}:${type}`;
  }
}

export const quotaManager = new QuotaManager();
// EOF

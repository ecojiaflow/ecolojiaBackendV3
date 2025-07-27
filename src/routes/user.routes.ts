// PATH: backend/src/routes/user.routes.ts
// ==============================
// ðŸ“ backend/src/routes/user.routes.ts
// SYSTÃˆME DE QUOTA ET GESTION UTILISATEUR ECOLOJIA
// ==============================

import express, { Request, Response, NextFunction } from 'express';
import { cacheAuthMiddleware } from '../middleware/cacheAuthMiddleware';
import { mongoDBService } from '../services/MongoDBService';
import { AnalysisCache } from '../models/AnalysisCache';
import { UserAnalytics } from '../models/UserAnalytics';
import { User } from '../models/User';

const router = express.Router();

// ==============================
// SYSTÃˆME DE QUOTA EN MÃ‰MOIRE
// ==============================

interface UserQuota {
  analyses: number;
  chat: number;
  lastReset: string;
  plan: 'free' | 'premium';
}

interface QuotaCheck {
  allowed: boolean;
  remaining: number;
  resetDate: Date;
  used?: number;
  limit?: number;
  plan?: 'free' | 'premium';
}

// Structure : { userId: { analyses: 5, lastReset: '2025-07-13', chat: 20 } }
const userQuotas = new Map<string, UserQuota>();

// Limites par dÃ©faut
const DAILY_LIMITS = {
  free: {
    analyses: 10,
    chat: 50
  },
  premium: {
    analyses: 100,
    chat: 500
  }
};

// ==============================
// UTILITAIRES QUOTA
// ==============================

function getUserId(req: any): string {
  // Si c'est une requÃªte authentifiÃ©e avec cacheAuthMiddleware
  if (req.cacheUser) {
    return req.cacheUser.id;
  }
  
  // Sinon, utilisateur anonyme
  return req.headers?.authorization?.replace('Bearer ', '') || 
         (req.headers?.['x-anonymous-id'] as string) || 
         'anonymous_' + Date.now();
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function initUserQuota(userId: string): UserQuota {
  const today = getTodayString();
  
  if (!userQuotas.has(userId) || userQuotas.get(userId)!.lastReset !== today) {
    userQuotas.set(userId, {
      analyses: 0,
      chat: 0,
      lastReset: today,
      plan: 'free'
    });
  }
  
  return userQuotas.get(userId)!;
}

function getResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

// ==============================
// ROUTE GET /api/user/quota
// Route existante amÃ©liorÃ©e
// ==============================

router.get('/quota', async (req: Request, res: Response) => {
  try {
    console.log('ðŸ“Š Demande quota utilisateur');
    
    const userId = getUserId(req);
    
    // Si l'utilisateur est authentifiÃ©, vÃ©rifier aussi dans MongoDB
    if (req.headers.authorization) {
      try {
        const quotaCheck = await mongoDBService.checkUserQuota(userId, 'analyses') as QuotaCheck;
        return res.json({
          success: true,
          allowed: quotaCheck.allowed,
          remaining: quotaCheck.remaining,
          resetDate: quotaCheck.resetDate,
          quota: {
            used_analyses: quotaCheck.used || 0,
            remaining_analyses: quotaCheck.remaining,
            daily_limit: quotaCheck.limit || DAILY_LIMITS.free.analyses,
            reset_time: quotaCheck.resetDate,
            current_date: getTodayString(),
            plan: quotaCheck.plan || 'free'
          }
        });
      } catch (mongoError) {
        console.log('âš ï¸ Fallback to in-memory quota');
      }
    }
    
    // Fallback to in-memory quota system
    const userQuota = initUserQuota(userId);
    const limits = DAILY_LIMITS[userQuota.plan] || DAILY_LIMITS.free;
    
    const response = {
      success: true,
      quota: {
        used_analyses: userQuota.analyses,
        remaining_analyses: Math.max(0, limits.analyses - userQuota.analyses),
        daily_limit: limits.analyses,
        used_chat: userQuota.chat,
        remaining_chat: Math.max(0, limits.chat - userQuota.chat),
        reset_time: getResetTime(),
        current_date: getTodayString(),
        plan: userQuota.plan
      }
    };
    
    console.log('âœ… Quota envoyÃ©:', response);
    res.json(response);
    
  } catch (error) {
    console.error('âŒ Erreur quota:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      error: 'Erreur serveur quota',
      quota: {
        used_analyses: 0,
        remaining_analyses: 10,
        daily_limit: 10,
        used_chat: 0,
        remaining_chat: 50,
        reset_time: getResetTime(),
        current_date: getTodayString(),
        plan: 'free'
      }
    });
  }
});

// ==============================
// ROUTE GET /api/user/me
// Route pour obtenir les infos utilisateur
// ==============================

router.get('/me', cacheAuthMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.cacheUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.cacheUser.id;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        tier: user.tier || req.cacheUser.tier || 'free',
        createdAt: user.createdAt,
        preferences: (user as any).preferences || {}
      }
    });
  } catch (error) {
    console.error('Get user error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// ==============================
// NOUVELLES ROUTES - HISTORIQUE
// ==============================

// Route pour sauvegarder une analyse dans l'historique
router.post('/history', cacheAuthMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.cacheUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.cacheUser.id;
    const { productId, analysisData, category } = req.body;

    // Enregistrer dans analytics
    await UserAnalytics.findOneAndUpdate(
      { 
        userId, 
        date: new Date().setHours(0, 0, 0, 0) 
      },
      {
        $push: {
          events: {
            type: 'scan',
            timestamp: new Date(),
            productId,
            category,
            healthScore: analysisData.healthScore,
            metadata: analysisData
          }
        },
        $addToSet: {
          'daily.uniqueProducts': productId,
          'daily.categoriesScanned': category
        },
        $inc: {
          'daily.scans': 1
        }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Save history error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ error: 'Failed to save to history' });
  }
});

// Route pour rÃ©cupÃ©rer l'historique
router.get('/history', cacheAuthMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.cacheUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.cacheUser.id;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // RÃ©cupÃ©rer les derniÃ¨res analyses de l'utilisateur
    const analytics = await UserAnalytics.find({ userId })
      .sort({ date: -1 })
      .limit(30); // 30 derniers jours

    // Extraire tous les Ã©vÃ©nements de type 'scan'
    const scanEvents: any[] = [];
    for (const day of analytics) {
      for (const event of day.events) {
        if (event.type === 'scan' && event.metadata) {
          scanEvents.push({
            productId: event.productId,
            productName: event.metadata.productName || 'Produit',
            brand: event.metadata.brand,
            category: event.category,
            analysis: {
              healthScore: event.healthScore,
              category: event.metadata.category,
              recommendations: event.metadata.recommendations || []
            },
            timestamp: event.timestamp
          });
        }
      }
    }

    // Trier par date et limiter
    const sortedEvents = scanEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    res.json(sortedEvents);
  } catch (error) {
    console.error('Get history error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// ==============================
// NOUVELLES ROUTES - ABONNEMENT
// ==============================

// Route pour obtenir le statut de l'abonnement
router.get('/subscription-status', cacheAuthMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.cacheUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.cacheUser.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      isActive: user.tier === 'premium' && user.subscriptionStatus === 'active',
      status: user.subscriptionStatus || 'inactive',
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      cancelledAt: user.subscriptionCancelledAt
    });
  } catch (error) {
    console.error('Get subscription status error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// ==============================
// NOUVELLES ROUTES - ANALYTICS
// ==============================

// Route pour obtenir les analytics utilisateur
router.get('/analytics', cacheAuthMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.cacheUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.cacheUser.id;
    const days = parseInt(req.query.days as string) || 30;
    
    const analytics = await mongoDBService.getUserAnalytics(userId, days);
    
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ==============================
// NOUVELLES ROUTES - PRÃ‰FÃ‰RENCES
// ==============================

// Route pour mettre Ã  jour les prÃ©fÃ©rences utilisateur
router.put('/preferences', cacheAuthMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.cacheUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.cacheUser.id;
    const { preferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true }
    );
    
    res.json({
      success: true,
      preferences: (user as any)?.preferences || {}
    });
  } catch (error) {
    console.error('Update preferences error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ==============================
// MIDDLEWARE VÃ‰RIFICATION QUOTA
// ==============================

export function checkAnalysisQuota(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const userQuota = initUserQuota(userId);
    const limits = DAILY_LIMITS[userQuota.plan] || DAILY_LIMITS.free;
    
    if (userQuota.analyses >= limits.analyses) {
      return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        message: 'Limite d\'analyses quotidienne atteinte',
        quota: {
          used_analyses: userQuota.analyses,
          remaining_analyses: 0,
          daily_limit: limits.analyses,
          reset_time: getResetTime()
        }
      });
    }
    
    // IncrÃ©menter le compteur
    userQuota.analyses++;
    userQuotas.set(userId, userQuota);
    
    console.log(`ðŸ“Š Quota analyse utilisÃ©: ${userQuota.analyses}/${limits.analyses} (user: ${userId.substring(0, 20)}...)`);
    next();
    
  } catch (error) {
    console.error('âŒ Erreur middleware quota analyse:', error); return res.status(500).json({ error: "Erreur serveur" });
    next(); // En cas d'erreur, on continue (mode dÃ©gradÃ©)
  }
}

export function checkChatQuota(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const userQuota = initUserQuota(userId);
    const limits = DAILY_LIMITS[userQuota.plan] || DAILY_LIMITS.free;
    
    if (userQuota.chat >= limits.chat) {
      return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        message: 'Limite de messages chat quotidienne atteinte',
        quota: {
          used_chat: userQuota.chat,
          remaining_chat: 0,
          reset_time: getResetTime()
        }
      });
    }
    
    // IncrÃ©menter le compteur
    userQuota.chat++;
    userQuotas.set(userId, userQuota);
    
    console.log(`ðŸ’¬ Quota chat utilisÃ©: ${userQuota.chat}/${limits.chat} (user: ${userId.substring(0, 20)}...)`);
    next();
    
  } catch (error) {
    console.error('âŒ Erreur middleware chat quota:', error); return res.status(500).json({ error: "Erreur serveur" });
    next(); // En cas d'erreur, on continue (mode dÃ©gradÃ©)
  }
}

// ==============================
// ROUTE DEBUG (optionnelle)
// ==============================

router.get('/quota/debug', (req: Request, res: Response) => {
  const allQuotas: any = {};
  userQuotas.forEach((quota, userId) => {
    allQuotas[userId.substring(0, 10) + '...'] = quota;
  });
  
  res.json({
    active_users: userQuotas.size,
    quotas: allQuotas,
    limits: DAILY_LIMITS,
    current_date: getTodayString()
  });
});

// ==============================
// EXPORT DEFAULT
// ==============================

export default router;

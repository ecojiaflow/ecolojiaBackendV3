// ==============================
// 📁 backend/src/routes/user.routes.ts
// SYSTÈME DE QUOTA ECOLOJIA
// ==============================

import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

// ==============================
// SYSTÈME DE QUOTA EN MÉMOIRE
// ==============================

interface UserQuota {
  analyses: number;
  chat: number;
  lastReset: string;
  plan: 'free' | 'premium';
}

// Structure : { userId: { analyses: 5, lastReset: '2025-07-13', chat: 20 } }
const userQuotas = new Map<string, UserQuota>();

// Limites par défaut
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

function getUserId(req: Request): string {
  // Utilisateur authentifié ou anonyme
  return req.headers.authorization?.replace('Bearer ', '') || 
         (req.headers['x-anonymous-id'] as string) || 
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
// ==============================

router.get('/quota', (req: Request, res: Response) => {
  try {
    console.log('📊 Demande quota utilisateur');
    
    const userId = getUserId(req);
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
    
    console.log('✅ Quota envoyé:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erreur quota:', error);
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
// MIDDLEWARE VÉRIFICATION QUOTA
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
    
    // Incrémenter le compteur
    userQuota.analyses++;
    userQuotas.set(userId, userQuota);
    
    console.log(`📊 Quota analyse utilisé: ${userQuota.analyses}/${limits.analyses} (user: ${userId.substring(0, 20)}...)`);
    next();
    
  } catch (error) {
    console.error('❌ Erreur middleware quota analyse:', error);
    next(); // En cas d'erreur, on continue (mode dégradé)
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
    
    // Incrémenter le compteur
    userQuota.chat++;
    userQuotas.set(userId, userQuota);
    
    console.log(`💬 Quota chat utilisé: ${userQuota.chat}/${limits.chat} (user: ${userId.substring(0, 20)}...)`);
    next();
    
  } catch (error) {
    console.error('❌ Erreur middleware chat quota:', error);
    next(); // En cas d'erreur, on continue (mode dégradé)
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
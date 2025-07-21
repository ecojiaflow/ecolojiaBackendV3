// backend/src/services/QuotaService.js

const mongoose = require('mongoose');

// ✅ CONFIGURATION QUOTAS 4.99€ OPTIMISÉE
const QUOTA_CONFIG = {
  free: {
    scansPerMonth: 25,
    aiQuestionsPerDay: 3,
    aiQuestionsPerMonth: 15,
    exportsPerMonth: 2,
    historyDays: 21,
    alternatives: 3, // Max alternatives suggérées
    features: {
      deepSeekAI: false,
      advancedAnalytics: false,
      apiAccess: false,
      coaching: false
    }
  },
  premium: {
    scansPerMonth: -1, // Illimité
    aiQuestionsPerDay: -1, // Illimité
    aiQuestionsPerMonth: -1, // Illimité
    exportsPerMonth: 50,
    historyDays: -1, // Illimité
    alternatives: -1, // Illimité
    features: {
      deepSeekAI: true,
      advancedAnalytics: true,
      apiAccess: true,
      coaching: true
    }
  }
};

// Schema MongoDB pour usage utilisateur
const UserUsageSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  tier: { type: String, enum: ['free', 'premium'], default: 'free' },
  
  // Compteurs période actuelle
  currentPeriod: {
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    scansUsed: { type: Number, default: 0 },
    aiQuestionsUsed: { type: Number, default: 0 },
    exportsUsed: { type: Number, default: 0 }
  },
  
  // Compteurs journaliers (pour IA)
  dailyUsage: {
    date: { type: Date, default: Date.now },
    aiQuestionsUsed: { type: Number, default: 0 }
  },
  
  // Métadonnées
  lastResetDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserUsage = mongoose.model('UserUsage', UserUsageSchema);

class QuotaService {
  
  // ✅ VÉRIFIER QUOTA AVANT ACTION
  async checkQuota(userId, action, tier = 'free') {
    try {
      const usage = await this.getUserUsage(userId, tier);
      const config = QUOTA_CONFIG[tier];
      const currentDate = new Date();
      
      switch (action) {
        case 'scan':
          if (config.scansPerMonth === -1) return { allowed: true, remaining: -1 };
          const scansRemaining = config.scansPerMonth - usage.currentPeriod.scansUsed;
          return {
            allowed: scansRemaining > 0,
            remaining: Math.max(0, scansRemaining),
            resetDate: this.getNextMonthReset()
          };
          
        case 'aiQuestion':
          // Double vérification : quotidien ET mensuel
          const isDifferentDay = !this.isSameDay(usage.dailyUsage.date, currentDate);
          
          if (isDifferentDay) {
            // Reset compteur journalier
            await this.resetDailyUsage(userId);
            usage.dailyUsage.aiQuestionsUsed = 0;
          }
          
          // Vérifier quota journalier
          if (config.aiQuestionsPerDay !== -1) {
            const dailyRemaining = config.aiQuestionsPerDay - usage.dailyUsage.aiQuestionsUsed;
            if (dailyRemaining <= 0) {
              return {
                allowed: false,
                remaining: 0,
                resetDate: this.getTomorrowReset(),
                limitType: 'daily'
              };
            }
          }
          
          // Vérifier quota mensuel
          if (config.aiQuestionsPerMonth !== -1) {
            const monthlyRemaining = config.aiQuestionsPerMonth - usage.currentPeriod.aiQuestionsUsed;
            if (monthlyRemaining <= 0) {
              return {
                allowed: false,
                remaining: 0,
                resetDate: this.getNextMonthReset(),
                limitType: 'monthly'
              };
            }
          }
          
          return { allowed: true, remaining: -1 };
          
        case 'export':
          if (config.exportsPerMonth === -1) return { allowed: true, remaining: -1 };
          const exportsRemaining = config.exportsPerMonth - usage.currentPeriod.exportsUsed;
          return {
            allowed: exportsRemaining > 0,
            remaining: Math.max(0, exportsRemaining),
            resetDate: this.getNextMonthReset()
          };
          
        default:
          return { allowed: false, error: 'Unknown action' };
      }
      
    } catch (error) {
      console.error('❌ Erreur vérification quota:', error);
      return { allowed: false, error: error.message };
    }
  }
  
  // ✅ INCRÉMENTER USAGE APRÈS ACTION
  async incrementUsage(userId, action, tier = 'free') {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const updateQuery = { userId };
      const updateData = {
        $inc: {},
        $set: {
          tier,
          updatedAt: currentDate
        }
      };
      
      switch (action) {
        case 'scan':
          updateData.$inc['currentPeriod.scansUsed'] = 1;
          break;
          
        case 'aiQuestion':
          updateData.$inc['currentPeriod.aiQuestionsUsed'] = 1;
          updateData.$inc['dailyUsage.aiQuestionsUsed'] = 1;
          updateData.$set['dailyUsage.date'] = currentDate;
          break;
          
        case 'export':
          updateData.$inc['currentPeriod.exportsUsed'] = 1;
          break;
      }
      
      // Upsert avec gestion période
      await UserUsage.findOneAndUpdate(
        updateQuery,
        {
          ...updateData,
          $setOnInsert: {
            userId,
            tier,
            currentPeriod: {
              month: currentMonth,
              year: currentYear,
              scansUsed: action === 'scan' ? 1 : 0,
              aiQuestionsUsed: action === 'aiQuestion' ? 1 : 0,
              exportsUsed: action === 'export' ? 1 : 0
            },
            dailyUsage: {
              date: currentDate,
              aiQuestionsUsed: action === 'aiQuestion' ? 1 : 0
            },
            createdAt: currentDate
          }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );
      
      console.log(`✅ Usage incrémenté: ${userId} → ${action}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erreur incrément usage:', error);
      return { success: false, error: error.message };
    }
  }
  
  // ✅ OBTENIR STATUS COMPLET UTILISATEUR
  async getUserQuotaStatus(userId, tier = 'free') {
    try {
      const usage = await this.getUserUsage(userId, tier);
      const config = QUOTA_CONFIG[tier];
      
      return {
        tier,
        scans: {
          used: usage.currentPeriod.scansUsed,
          limit: config.scansPerMonth,
          remaining: config.scansPerMonth === -1 ? -1 : 
            Math.max(0, config.scansPerMonth - usage.currentPeriod.scansUsed),
          resetDate: this.getNextMonthReset()
        },
        aiQuestions: {
          dailyUsed: usage.dailyUsage.aiQuestionsUsed,
          dailyLimit: config.aiQuestionsPerDay,
          dailyRemaining: config.aiQuestionsPerDay === -1 ? -1 :
            Math.max(0, config.aiQuestionsPerDay - usage.dailyUsage.aiQuestionsUsed),
          monthlyUsed: usage.currentPeriod.aiQuestionsUsed,
          monthlyLimit: config.aiQuestionsPerMonth,
          monthlyRemaining: config.aiQuestionsPerMonth === -1 ? -1 :
            Math.max(0, config.aiQuestionsPerMonth - usage.currentPeriod.aiQuestionsUsed),
          resetDate: this.getNextMonthReset()
        },
        exports: {
          used: usage.currentPeriod.exportsUsed,
          limit: config.exportsPerMonth,
          remaining: config.exportsPerMonth === -1 ? -1 :
            Math.max(0, config.exportsPerMonth - usage.currentPeriod.exportsUsed),
          resetDate: this.getNextMonthReset()
        },
        features: config.features,
        lastUpdated: usage.updatedAt
      };
      
    } catch (error) {
      console.error('❌ Erreur status quota:', error);
      return null;
    }
  }
  
  // ✅ MIDDLEWARE EXPRESS POUR ROUTES PROTÉGÉES
  checkQuotaMiddleware(action) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const userTier = req.user?.tier || 'free';
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
            code: 'AUTH_REQUIRED'
          });
        }
        
        const quotaCheck = await this.checkQuota(userId, action, userTier);
        
        if (!quotaCheck.allowed) {
          return res.status(429).json({
            success: false,
            error: `Quota ${action} exceeded`,
            code: 'QUOTA_EXCEEDED',
            quota: quotaCheck,
            upgrade: {
              message: 'Passez Premium pour débloquer',
              price: '4.99€/mois',
              benefits: this.getUpgradeBenefits(action)
            }
          });
        }
        
        // Passer au middleware suivant
        req.quotaCheck = quotaCheck;
        next();
        
      } catch (error) {
        console.error('❌ Erreur middleware quota:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }
  
  // ✅ UTILITAIRES PRIVÉES
  async getUserUsage(userId, tier) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    let usage = await UserUsage.findOne({ userId });
    
    if (!usage) {
      // Créer nouveau utilisateur
      usage = new UserUsage({
        userId,
        tier,
        currentPeriod: {
          month: currentMonth,
          year: currentYear,
          scansUsed: 0,
          aiQuestionsUsed: 0,
          exportsUsed: 0
        },
        dailyUsage: {
          date: currentDate,
          aiQuestionsUsed: 0
        }
      });
      await usage.save();
    } else {
      // Vérifier si période mensuelle a changé
      if (usage.currentPeriod.month !== currentMonth || 
          usage.currentPeriod.year !== currentYear) {
        await this.resetMonthlyUsage(userId, currentMonth, currentYear);
        usage = await UserUsage.findOne({ userId });
      }
    }
    
    return usage;
  }
  
  async resetMonthlyUsage(userId, newMonth, newYear) {
    await UserUsage.findOneAndUpdate(
      { userId },
      {
        $set: {
          'currentPeriod.month': newMonth,
          'currentPeriod.year': newYear,
          'currentPeriod.scansUsed': 0,
          'currentPeriod.aiQuestionsUsed': 0,
          'currentPeriod.exportsUsed': 0,
          lastResetDate: new Date(),
          updatedAt: new Date()
        }
      }
    );
    console.log(`🔄 Reset mensuel: ${userId} → ${newMonth}/${newYear}`);
  }
  
  async resetDailyUsage(userId) {
    await UserUsage.findOneAndUpdate(
      { userId },
      {
        $set: {
          'dailyUsage.date': new Date(),
          'dailyUsage.aiQuestionsUsed': 0,
          updatedAt: new Date()
        }
      }
    );
  }
  
  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
  }
  
  getNextMonthReset() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  
  getTomorrowReset() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  
  getUpgradeBenefits(action) {
    const benefits = {
      scan: ['Scans illimités', 'Toutes catégories', 'Historique complet'],
      aiQuestion: ['Questions IA illimitées', 'DeepSeek avancé', 'Coaching 24/7'],
      export: ['50 exports/mois', 'Formats multiples', 'API access']
    };
    return benefits[action] || ['Toutes fonctionnalités Premium'];
  }
}

// ✅ ROUTES API QUOTAS
const quotaService = new QuotaService();

// GET /api/user/quota-status
const getQuotaStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const userTier = req.user.tier || 'free';
    
    const status = await quotaService.getUserQuotaStatus(userId, userTier);
    
    if (!status) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch quota status'
      });
    }
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Erreur API quota status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /api/user/increment-usage
const incrementUsageAPI = async (req, res) => {
  try {
    const userId = req.user.id;
    const userTier = req.user.tier || 'free';
    const { action } = req.body;
    
    if (!['scan', 'aiQuestion', 'export'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      });
    }
    
    const result = await quotaService.incrementUsage(userId, action, userTier);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    // Retourner nouveau status
    const newStatus = await quotaService.getUserQuotaStatus(userId, userTier);
    
    res.json({
      success: true,
      data: newStatus
    });
    
  } catch (error) {
    console.error('❌ Erreur API increment usage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  QuotaService,
  quotaService,
  getQuotaStatus,
  incrementUsageAPI,
  QUOTA_CONFIG
};
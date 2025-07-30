// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARE D'AUTHENTIFICATION PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

const auth = async (req, res, next) => {
  try {
    // Extraire le token du header Authorization
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token non fourni',
        code: 'NO_TOKEN'
      });
    }

    // Vérifier et décoder le token
    let decoded;
    try {
      decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'ecolojia-secret-key-2024-super-secure'
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expiré',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }

    // Vérifier si l'utilisateur est actif
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Compte suspendu',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    if (user.status === 'deleted') {
      return res.status(403).json({
        success: false,
        message: 'Compte supprimé',
        code: 'ACCOUNT_DELETED'
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    req.userId = user._id.toString();
    req.token = token;

    // Log pour debug
    console.log(`[Auth] User ${user.email} authenticated successfully`);

    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification',
      code: 'AUTH_ERROR'
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARE OPTIONNEL (ne bloque pas si pas de token)
// ═══════════════════════════════════════════════════════════════════════

const authOptional = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        // Vérifier le token
        const decoded = jwt.verify(
          token, 
          process.env.JWT_SECRET || 'ecolojia-secret-key-2024-super-secure'
        );

        // Récupérer l'utilisateur
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.status !== 'suspended' && user.status !== 'deleted') {
          req.user = user;
          req.userId = user._id.toString();
          req.token = token;
          console.log(`[Auth Optional] User ${user.email} authenticated`);
        }
      } catch (error) {
        // Ignorer les erreurs de token en mode optionnel
        console.log('[Auth Optional] Invalid token, continuing without auth');
      }
    }

    next();
  } catch (error) {
    // Continuer même si erreur
    console.error('[Auth Optional] Error:', error);
    next();
  }
};

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARE PREMIUM
// ═══════════════════════════════════════════════════════════════════════

const requirePremium = async (req, res, next) => {
  try {
    // S'assurer que l'utilisateur est authentifié d'abord
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    // Vérifier le tier
    if (req.user.tier !== 'premium') {
      return res.status(403).json({
        success: false,
        message: 'Fonctionnalité réservée aux membres Premium',
        code: 'PREMIUM_REQUIRED',
        requiresUpgrade: true,
        upgradeUrl: '/pricing'
      });
    }

    console.log(`[Premium] User ${req.user.email} has premium access`);
    next();
  } catch (error) {
    console.error('[Premium Middleware] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de vérification Premium',
      code: 'PREMIUM_CHECK_ERROR'
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARE DE QUOTAS
// ═══════════════════════════════════════════════════════════════════════

const checkQuota = (quotaType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise',
          code: 'AUTH_REQUIRED'
        });
      }

      const quotas = req.user.quotas || {};
      let quotaField, resetField, defaultQuota;

      // Configuration selon le type de quota
      switch (quotaType) {
        case 'scan':
          quotaField = 'scansRemaining';
          resetField = 'scansResetDate';
          defaultQuota = req.user.tier === 'premium' ? 999999 : 30;
          break;
        case 'chat':
          quotaField = 'aiChatsRemaining';
          resetField = 'aiChatsResetDate';
          defaultQuota = req.user.tier === 'premium' ? 500 : 5;
          break;
        case 'export':
          quotaField = 'exportsRemaining';
          resetField = 'exportsResetDate';
          defaultQuota = req.user.tier === 'premium' ? 100 : 0;
          break;
        default:
          console.warn(`[Quota] Unknown quota type: ${quotaType}`);
          return next();
      }

      // Vérifier si la date de reset est passée
      if (quotas[resetField] && new Date(quotas[resetField]) < new Date()) {
        console.log(`[Quota] Resetting ${quotaType} quota for user ${req.user.email}`);
        
        // Réinitialiser les quotas
        await User.findByIdAndUpdate(req.user._id, {
          [`quotas.${quotaField}`]: defaultQuota,
          [`quotas.${resetField}`]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 jours
        });

        req.user.quotas[quotaField] = defaultQuota;
        req.user.quotas[resetField] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      // Vérifier le quota restant
      const remaining = quotas[quotaField] || 0;
      if (remaining <= 0) {
        return res.status(429).json({
          success: false,
          message: `Quota ${quotaType} épuisé`,
          code: 'QUOTA_EXCEEDED',
          quotaType,
          remaining: 0,
          resetDate: quotas[resetField],
          requiresUpgrade: req.user.tier === 'free'
        });
      }

      // Ajouter les infos de quota à la requête
      req.quota = {
        type: quotaType,
        remaining: remaining - 1,
        resetDate: quotas[resetField]
      };

      // Fonction pour décrémenter le quota (à appeler après succès)
      req.decrementQuota = async () => {
        try {
          await User.findByIdAndUpdate(req.user._id, {
            $inc: { [`quotas.${quotaField}`]: -1 }
          });
          console.log(`[Quota] Decremented ${quotaType} quota for user ${req.user.email}. Remaining: ${remaining - 1}`);
        } catch (error) {
          console.error('[Quota] Error decrementing quota:', error);
        }
      };

      next();
    } catch (error) {
      console.error('[Quota Middleware] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur de vérification des quotas',
        code: 'QUOTA_CHECK_ERROR'
      });
    }
  };
};

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARE ADMIN
// ═══════════════════════════════════════════════════════════════════════

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    // Vérifier si l'utilisateur est admin
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs',
        code: 'ADMIN_REQUIRED'
      });
    }

    console.log(`[Admin] Admin ${req.user.email} accessing admin route`);
    next();
  } catch (error) {
    console.error('[Admin Middleware] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de vérification admin',
      code: 'ADMIN_CHECK_ERROR'
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  // Middlewares principaux
  auth,
  authOptional,
  requirePremium,
  checkQuota,
  requireAdmin,
  
  // Alias pour compatibilité
  authMiddleware: auth,
  authOptionalMiddleware: authOptional
};
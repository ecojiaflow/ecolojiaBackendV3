// PATH: backend/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { authService } from '../auth/services/AuthService';
import { authMiddleware } from '../middleware/authMiddleware';

// Import des middlewares de sécurité
import { authRateLimit } from '../middleware/rateLimiter';
import { asyncErrorHandler } from '../middleware/errorHandler';
import { ValidationError, AuthenticationError } from '../utils/errors';
import { createLogger } from '../utils/logger';

// Créer le logger pour les routes auth
const logger = createLogger('AuthRoutes');
const router = Router();

// ✅ Validation schemas
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password && password.length >= 6;
};

const validateName = (name: string): boolean => {
  return name && name.trim().length >= 2 && name.trim().length <= 100;
};

// ✅ Route d'inscription avec sécurité
router.post('/register', authRateLimit(), asyncErrorHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  // Log de la tentative d'inscription
  logger.info('Registration attempt', { email, name });

  // Validation complète
  const validationErrors: string[] = [];

  if (!email) {
    validationErrors.push('Email requis');
  } else if (!validateEmail(email)) {
    validationErrors.push('Format email invalide');
  }

  if (!password) {
    validationErrors.push('Mot de passe requis');
  } else if (!validatePassword(password)) {
    validationErrors.push('Le mot de passe doit contenir au moins 6 caractères');
  }

  if (!name) {
    validationErrors.push('Nom requis');
  } else if (!validateName(name)) {
    validationErrors.push('Le nom doit contenir entre 2 et 100 caractères');
  }

  if (validationErrors.length > 0) {
    throw new ValidationError('Erreurs de validation', { errors: validationErrors });
  }

  // Collecter les infos de session
  const sessionInfo = {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    origin: req.headers.origin || req.headers.referer || 'unknown'
  };

  // Appeler le service
  const result = await authService.register(
    { 
      email: email.toLowerCase().trim(), 
      password, 
      name: name.trim() 
    },
    sessionInfo
  );

  if (result.success) {
    logger.info('User registered successfully', { userId: result.user?.id, email });
    res.status(201).json(result);
  } else {
    logger.warn('Registration failed', { email, reason: result.message });
    res.status(400).json(result);
  }
}));

// ✅ Route de connexion avec sécurité
router.post('/login', authRateLimit(), asyncErrorHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  logger.info('Login attempt', { email });

  // Validation
  if (!email || !password) {
    throw new ValidationError('Email et mot de passe requis');
  }

  if (!validateEmail(email)) {
    throw new ValidationError('Format email invalide');
  }

  // Collecter les infos de session
  const sessionInfo = {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    origin: req.headers.origin || req.headers.referer || 'unknown'
  };

  // Appeler le service
  const result = await authService.login(
    { 
      email: email.toLowerCase().trim(), 
      password 
    },
    sessionInfo
  );

  if (result.success && result.token) {
    logger.info('User logged in successfully', { userId: result.user?.id, email });
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      user: result.user,
      session: {
        token: result.token,
        refreshToken: result.refreshToken || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  } else {
    logger.warn('Login failed', { email, reason: result.message });
    throw new AuthenticationError(result.message || 'Email ou mot de passe incorrect');
  }
}));

// ✅ Route de déconnexion
router.post('/logout', authMiddleware, asyncErrorHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = (req as any).user?._id;
  
  logger.info('Logout attempt', { userId });
  
  if (token) {
    await authService.logout(token);
  }

  logger.info('User logged out successfully', { userId });
  
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
}));

// ✅ Route profil utilisateur
router.get('/profile', authMiddleware, asyncErrorHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  logger.debug('Profile access', { userId: user._id });
  
  res.json({
    success: true,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      tier: user.tier || 'free',
      isEmailVerified: user.isEmailVerified || false,
      quotas: user.quotas || {
        scansPerMonth: 30,
        aiQuestionsPerDay: 0,
        exportsPerMonth: 0
      },
      currentUsage: user.currentUsage || {
        scansThisMonth: 0,
        aiQuestionsToday: 0,
        exportsThisMonth: 0
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
}));

// ✅ Route vérification email
router.get('/verify-email/:token', asyncErrorHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  
  logger.info('Email verification attempt', { token: token.substring(0, 10) + '...' });
  
  if (!token) {
    throw new ValidationError('Token de vérification requis');
  }
  
  const result = await authService.verifyEmail(token);
  
  if (result.success) {
    logger.info('Email verified successfully');
    res.json(result);
  } else {
    logger.warn('Email verification failed', { reason: result.message });
    res.status(400).json(result);
  }
}));

// ✅ Route demande réinitialisation mot de passe
router.post('/forgot-password', authRateLimit(), asyncErrorHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  logger.info('Password reset request', { email });

  if (!email) {
    throw new ValidationError('Email requis');
  }

  if (!validateEmail(email)) {
    throw new ValidationError('Format email invalide');
  }

  const result = await authService.requestPasswordReset(email.toLowerCase().trim());
  
  // Toujours retourner succès pour éviter l'énumération d'utilisateurs
  logger.info('Password reset email sent (if user exists)', { email });
  
  res.json({
    success: true,
    message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
  });
}));

// ✅ Route réinitialisation mot de passe
router.post('/reset-password/:token', authRateLimit(), asyncErrorHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  logger.info('Password reset attempt', { token: token.substring(0, 10) + '...' });

  if (!token) {
    throw new ValidationError('Token de réinitialisation requis');
  }

  if (!password || !validatePassword(password)) {
    throw new ValidationError('Le nouveau mot de passe doit contenir au moins 6 caractères');
  }

  const result = await authService.resetPassword(token, password);
  
  if (result.success) {
    logger.info('Password reset successfully');
    res.json(result);
  } else {
    logger.warn('Password reset failed', { reason: result.message });
    res.status(400).json(result);
  }
}));

// ✅ Route mise à jour profil
router.put('/profile', authMiddleware, asyncErrorHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name } = req.body;
  
  logger.info('Profile update attempt', { userId: user._id });
  
  // Validation
  if (name && !validateName(name)) {
    throw new ValidationError('Le nom doit contenir entre 2 et 100 caractères');
  }
  
  // Mise à jour via service (à implémenter)
  // const result = await authService.updateProfile(user._id, { name });
  
  res.json({
    success: true,
    message: 'Profil mis à jour',
    user: {
      ...user.toObject(),
      name: name || user.name
    }
  });
}));

// ✅ Route test santé auth
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'auth',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
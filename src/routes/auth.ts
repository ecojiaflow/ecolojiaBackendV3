// PATH: backend/src/routes/auth.ts
import express from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../auth/services/AuthService'; // ✅ Import corrigé
import { emailService } from '../auth/services/EmailService';

const router = express.Router();

// === MIDDLEWARE DE VALIDATION ===

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
];

// === ROUTES AUTH ===

/**
 * GET /api/auth/health
 * Health check du système d'authentification
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ECOLOJIA Authentication System',
    status: 'operational',
    version: '2.1.0',
    features: {
      registration: 'active',
      login: 'active',
      emailValidation: 'active',
      jwt: 'active',
      passwordHashing: 'active'
    },
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/me',
      logout: 'POST /api/auth/logout'
    },
    security: {
      bcrypt: 'enabled',
      jwt: 'enabled',
      rateLimit: 'enabled'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/auth/register
 * Inscription nouvel utilisateur
 */
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Validation des données
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // Information session pour sécurité
    const sessionInfo = {
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    };

    console.log('📝 Tentative inscription:', { email, name });

    // Appel service d'inscription
    const result = await authService.register(
      { email, password, name },
      sessionInfo
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Envoi email de validation
    let emailSent = false;
    if (result.user) {
      emailSent = await emailService.sendVerificationEmail(
        result.user.id,
        result.user.email,
        result.user.name
      );
    }

    console.log('✅ Inscription réussie:', email, '| Email envoyé:', emailSent);

    res.status(201).json({
      ...result,
      emailSent,
      message: result.message + (emailSent 
        ? ' Un email de validation a été envoyé.' 
        : ' Attention: email de validation non envoyé.')
    });

  } catch (error: any) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Validation des données
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Information session
    const sessionInfo = {
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    };

    console.log('🔑 Tentative connexion:', email);

    // Appel service de connexion
    const result = await authService.login(
      { email, password },
      sessionInfo
    );

    if (!result.success) {
      return res.status(401).json(result);
    }

    console.log('✅ Connexion réussie:', email);

    res.json(result);

  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
});

/**
 * GET /api/auth/me
 * Récupération profil utilisateur (JWT requis)
 */
router.get('/me', async (req, res) => {
  try {
    // Récupération token JWT
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification requis'
      });
    }

    // Vérification token et récupération utilisateur
    const user = await authService.getUserFromToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    res.json({
      success: true,
      user,
      message: 'Profil utilisateur récupéré'
    });

  } catch (error: any) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du profil'
    });
  }
});

/**
 * POST /api/auth/logout
 * Déconnexion utilisateur
 */
router.post('/logout', async (req, res) => {
  try {
    // Récupération token JWT
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification requis'
      });
    }

    // Appel service de déconnexion
    const result = await authService.logout(token);

    console.log('👋 Déconnexion:', result.success);

    res.json(result);

  } catch (error: any) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la déconnexion'
    });
  }
});

export default router;
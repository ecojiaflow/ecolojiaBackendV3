// ═══════════════════════════════════════════════════════════════════════
// 1. backend/src/routes/auth.js
// ═══════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Générer JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'ecolojia-secret-key-2024-super-secure',
    { expiresIn: '7d' }
  );
};

// Générer Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + '-refresh',
    { expiresIn: '30d' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password et nom requis'
      });
    }

    // Vérifier si l'utilisateur existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Cet email est déjà utilisé'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      tier: 'free',
      quotas: {
        scansRemaining: 30,
        scansResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        aiChatsRemaining: 5,
        aiChatsResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    // Générer tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    console.log('[Auth] New user registered:', user.email);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        tier: user.tier
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'inscription'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    console.log('[Auth] User logged in:', user.email);

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        tier: user.tier
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion'
    });
  }
});

// GET /api/auth/profile (protégé)
router.get('/profile', async (req, res) => {
  try {
    // Extraire le token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ecolojia-secret-key-2024-super-secure');
    
    // Récupérer l'utilisateur
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        quotas: user.quotas,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('[Auth] Profile error:', error);
    res.status(401).json({
      success: false,
      error: 'Token invalide'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // Dans une vraie app, on pourrait blacklister le token
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

// GET /api/auth/health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'auth',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

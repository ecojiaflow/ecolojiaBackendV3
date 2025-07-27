// PATH: backend/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { authService } from '../auth/services/AuthService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Route d'inscription
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validation basique
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, mot de passe et nom sont requis'
      });
    }

    // Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email invalide'
      });
    }

    // Validation mot de passe (min 6 caractÃ¨res)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractÃ¨res'
      });
    }

    const sessionInfo = {
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    };

    const result = await authService.register(
      { email, password, name },
      sessionInfo
    );

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Register route error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route de connexion
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    const sessionInfo = {
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    };

    const result = await authService.login(
      { email, password },
      sessionInfo
    );

    if (result.success && result.token) {
      res.json({
        success: true,
        message: 'Connexion rÃ©ussie',
        user: result.user,
        session: {
          token: result.token,
          refreshToken: '', // Non utilisÃ© pour l'instant
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login route error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route de dÃ©connexion
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      await authService.logout(token);
    }

    res.json({
      success: true,
      message: 'DÃ©connexion rÃ©ussie'
    });
  } catch (error) {
    console.error('Logout route error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route profil utilisateur
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        isEmailVerified: user.isEmailVerified,
        quotas: user.quotas,
        usage: user.usage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Profile route error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route vÃ©rification email
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const result = await authService.verifyEmail(token);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Verify email route error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route demande rÃ©initialisation mot de passe
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis'
      });
    }

    const result = await authService.requestPasswordReset(email);
    
    res.json(result);
  } catch (error) {
    console.error('Forgot password route error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route rÃ©initialisation mot de passe
router.post('/reset-password/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractÃ¨res'
      });
    }

    const result = await authService.resetPassword(token, password);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Reset password route error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route test santÃ© auth
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

export default router;

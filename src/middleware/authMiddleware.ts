// PATH: backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../auth/services/AuthService';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token non fourni'
      });
    }

    const user = await authService.getUserFromToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expirÃ©'
      });
    }

    // Attacher l'utilisateur Ã  la requÃªte
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

// Middleware optionnel (n'arrÃªte pas si pas de token)
export const authOptionalMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const user = await authService.getUserFromToken(token);
      if (user) {
        req.user = user;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Continuer mÃªme si erreur
    next();
  }
};




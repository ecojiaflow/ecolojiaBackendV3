// backend/src/auth/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../models/User';

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Type simplifié pour éviter les conflits
interface AuthUser {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'premium';
  isEmailVerified: boolean;
}

/**
 * Middleware d'authentification simple
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JWTPayload;

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
      return;
    }

    // Assigner l'utilisateur avec le bon type
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      tier: user.tier || 'free',
      isEmailVerified: user.isEmailVerified || false
    };

    console.log(`[AUTH] User authenticated: ${user.email}`);
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
      return;
    }

    console.error('[AUTH ERROR]:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const requirePremium = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
    return;
  }

  if (req.user.tier !== 'premium') {
    res.status(403).json({
      success: false,
      message: 'Accès réservé aux utilisateurs Premium'
    });
    return;
  }

  next();
};

export const requireVerifiedEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
    return;
  }

  if (!req.user.isEmailVerified) {
    res.status(403).json({
      success: false,
      message: 'Veuillez vérifier votre adresse email'
    });
    return;
  }

  next();
};

export default authenticate;
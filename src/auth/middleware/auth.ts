// PATH: backend/src/auth/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Logger } from '../../utils/Logger';

const log = new Logger('AuthMiddleware');

// Interface pour les requêtes authentifiées qui étend Express Request
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: 'free' | 'premium';
  };
}

// Middleware d'authentification principal
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Récupération du token depuis le header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token d\'authentification requis',
        code: 'NO_TOKEN'
      });
      return;
    }

    // Vérification du token
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Ajout des informations utilisateur à la requête
    (req as AuthRequest).user = {
      id: decoded.userId,
      email: decoded.email,
      tier: (decoded.tier as 'free' | 'premium') || 'free'
    };

    log.info(`Utilisateur authentifié: ${decoded.email}`);
    next();

  } catch (error: any) {
    log.error('Erreur authentification:', error);
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware pour vérifier si l'utilisateur est premium
export const requirePremium = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user) {
    res.status(401).json({
      success: false,
      message: 'Authentification requise',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }

  if (authReq.user.tier !== 'premium') {
    res.status(403).json({
      success: false,
      message: 'Abonnement Premium requis',
      code: 'PREMIUM_REQUIRED'
    });
    return;
  }

  next();
};

// Middleware optionnel - authentifie si token présent mais ne bloque pas
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = await verifyToken(token);
      if (decoded) {
        (req as AuthRequest).user = {
          id: decoded.userId,
          email: decoded.email,
          tier: (decoded.tier as 'free' | 'premium') || 'free'
        };
      }
    }
  } catch (error) {
    // Ignorer les erreurs - authentification optionnelle
    log.debug('Auth optionnelle échouée, continuer sans auth');
  }

  next();
};

export default authenticate;
// PATH: backend/src/auth/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { Logger } from '../../utils/Logger';

const prisma = new PrismaClient();
const log = new Logger('AuthMiddleware');

// Extension de Request pour TypeScript
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    tier: 'free' | 'premium';
    emailVerified: boolean;
  };
  token?: string;
}

/**
 * Middleware d'authentification unifié
 * Utilise les utilitaires JWT du projet
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extraction du token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      log.warn('Token manquant dans la requête');
      res.status(401).json({
        success: false,
        message: 'Token manquant',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // 2. Vérification JWT avec l'utilitaire
    let decoded: JwtPayload;
    try {
      decoded = verifyToken(token);
    } catch (jwtError: any) {
      log.warn(`JWT invalide: ${jwtError.message}`);
      res.status(401).json({
        success: false,
        message: 'Token invalide',
        code: 'INVALID_TOKEN',
        details: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
      return;
    }

    // 3. Récupération utilisateur avec Prisma
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      log.warn(`Utilisateur non trouvé: ${decoded.userId}`);
      res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // 4. Vérification email (peut être désactivée selon les besoins)
    if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      log.warn(`Email non vérifié pour: ${user.email}`);
      res.status(403).json({
        success: false,
        message: 'Email non vérifié',
        code: 'EMAIL_NOT_VERIFIED',
        emailVerificationRequired: true
      });
      return;
    }

    // 5. Déterminer le tier
    const tier: 'free' | 'premium' = decoded.tier === 'premium' ? 'premium' : 'free';

    // 6. Attacher à la requête
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      tier,
      emailVerified: user.emailVerified
    };
    req.token = token;

    log.debug(`Auth OK pour: ${user.email} (${tier})`);
    next();

  } catch (error: any) {
    log.error('Erreur middleware auth:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur authentification',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware optionnel - attache l'utilisateur si token présent
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }

  // Utiliser authenticate mais continuer même si échec
  authenticate(req, res, () => {
    next();
  });
};

/**
 * Middleware pour routes admin uniquement
 */
export const adminAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await authenticate(req, res, () => {
    if (req.user?.email !== process.env.ADMIN_EMAIL) {
      res.status(403).json({
        success: false,
        message: 'Accès administrateur requis',
        code: 'ADMIN_REQUIRED'
      });
      return;
    }
    next();
  });
};
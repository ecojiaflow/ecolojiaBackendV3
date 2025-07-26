// PATH: backend/src/middleware/auth.ts
// Adaptateur pour la compatibilité avec payment.routes.ts

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/utils/jwt';
import { Logger } from '../utils/Logger';

const log = new Logger('PaymentAuth');

// Extension de Request pour inclure userId
interface PaymentAuthRequest extends Request {
  userId?: string;
}

// Version simplifiée de authenticateToken pour payment.routes.ts
export const authenticateToken = async (
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
        error: 'Token d\'authentification requis'
      });
      return;
    }

    // Vérification du token
    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      res.status(401).json({
        success: false,
        error: 'Token invalide ou expiré'
      });
      return;
    }

    // Ajout de userId à la requête
    (req as PaymentAuthRequest).userId = decoded.userId;
    
    log.info(`Utilisateur authentifié pour paiement: ${decoded.email || decoded.userId}`);
    next();

  } catch (error: any) {
    log.error('Erreur authentification paiement:', error);
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Token expiré'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'authentification'
    });
  }
};
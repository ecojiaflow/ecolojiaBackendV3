// PATH: src/auth/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import UserModel from '../../models/User';            // ✅ import par défaut
import { Logger } from '../../utils/Logger';

const logger = new Logger('AuthMiddleware');

interface JwtPayload {
  userId: string;
  email: string;
  tier?: 'free' | 'premium' | string;
}

/**
 * Middleware d'authentification
 *  • Gère IDs en ObjectId **et** UUID
 *  • Attache req.user { id, email, tier }
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    /* 1. Extraire le token */
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant' });
    }
    const token = authHeader.split(' ')[1];

    /* 2. Vérifier / décoder */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;

    /* 3. Chercher l'utilisateur (ObjectId OU UUID) */
    const query = mongoose.Types.ObjectId.isValid(decoded.userId)
      ? { _id: decoded.userId }
      : { id: decoded.userId };

    const user = await UserModel.findOne(query).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }

    /* 4. Attacher et next */
    req.user = {
      id: user.id || user._id?.toString(),
      email: user.email,
      tier: user.tier || 'free'
    };

    next();
  } catch (err) {
    logger.error('[AUTH ERROR]:', err);
    res.status(401).json({ success: false, message: 'Token invalide' });
  }
}
// EOF

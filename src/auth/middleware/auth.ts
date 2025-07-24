// PATH: backend/src/auth/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { UserModel } from '../../models/User';
import { Logger } from '../../utils/Logger';

const logger = new Logger('AuthMiddleware');

interface JwtPayload {
  userId: string;
  email: string;
  tier?: 'free' | 'premium' | string;
}

/**
 * Vérifie le JWT et attache req.user
 *  • Accepte des IDs au format ObjectId **ou** UUID (string)
 *  • Répond 401 si token manquant/invalide ou utilisateur introuvable
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    /* 1 – Extraire le token */
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant' });
    }
    const token = authHeader.split(' ')[1];

    /* 2 – Vérifier / décoder */
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    /* 3 – Chercher l’utilisateur (ObjectId OU UUID) */
    const { userId } = decoded;
    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId }
      : { id: userId }; // champ id = UUID

    const user = await UserModel.findOne(query).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }

    /* 4 – Attacher les infos utiles : */
    req.user = {
      id: user.id || user._id?.toString(),
      email: user.email,
      tier: user.tier || 'free'
    };

    return next();
  } catch (err: any) {
    logger.error('[AUTH ERROR]:', err);
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
}
// EOF

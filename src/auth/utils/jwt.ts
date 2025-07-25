// PATH: backend/src/auth/utils/jwt.ts
import jwt, { SignOptions } from 'jsonwebtoken';

/** Charge la clé et la durée depuis .env */
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JwtPayload {
  userId: string;
  email: string;
  tier?: 'free' | 'premium' | string;
}

/** Signe un token avec les réglages maison */
export function signToken(
  payload: JwtPayload,
  options?: SignOptions
): string {
  // Fix TypeScript: cast explicite ou utilisation directe
  const finalOptions: SignOptions = options || {};
  
  // Si pas d'expiresIn dans les options, on l'ajoute
  if (!finalOptions.expiresIn) {
    finalOptions.expiresIn = JWT_EXPIRES_IN as any; // Cast nécessaire pour TypeScript
  }
  
  return jwt.sign(payload, JWT_SECRET, finalOptions);
}

/** Vérifie et retourne le payload (lève en cas d'échec) */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/** Décodage sans vérification – strictement pour debugging */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}
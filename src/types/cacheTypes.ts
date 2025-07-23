// PATH: backend/src/types/cacheTypes.ts
import { Request } from 'express';

// Interface pour l'utilisateur dans le cache (différente de SafeUser)
export interface CacheUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  tier?: 'free' | 'premium';
  quotas?: {
    scansPerMonth: number;
    aiQuestionsPerDay: number;
    exportsPerMonth: number;
  };
}

// Interface pour les requêtes avec cache auth
export interface CacheAuthRequest extends Request {
  cacheUser?: CacheUser;
  cacheSession?: {
    id: string;
    token: string;
    expiresAt: Date;
  };
}
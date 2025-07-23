// À REMPLACER dans backend/src/auth/types/AuthTypes.ts

// Interface Session complète
export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;  // Ajouté
  expiresAt: Date;
  createdAt: Date;
  isActive: boolean;
}

// Interface User complète
export interface User {
  id: string;
  email: string;
  password: string;
  passwordHash?: string;  // Ajouté comme alias
  name: string;
  tier: 'free' | 'premium';
  isEmailVerified: boolean;
  emailVerified?: boolean;  // Ajouté comme alias
  lastLoginAt?: Date;  // Ajouté
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}
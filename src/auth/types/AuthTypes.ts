// 🔴 BACKEND - backend/src/auth/types/AuthTypes.ts

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  tier: 'free' | 'premium';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  stripeCustomerId?: string;
  
  preferences: {
    language: 'fr' | 'en';
    notifications: boolean;
    darkMode: boolean;
    allergies?: string[];
    dietaryRestrictions?: string[];
  };
  
  quotas: {
    scansPerMonth: number;
    aiQuestionsPerDay: number;
    exportsPerMonth: number;
  };
  
  currentUsage: {
    scansThisMonth: number;
    aiQuestionsToday: number;
    exportsThisMonth: number;
    lastResetDate: Date;
  };
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export type SafeUser = Omit<User, 'passwordHash'>;

// Request Types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionInfo {
  ipAddress: string;
  userAgent: string;
}

// Response Types
export interface RegisterResult {
  success: boolean;
  userId: string;
  message: string;
}

export interface LoginResult {
  success: boolean;
  user: SafeUser;
  session: {
    token: string;
    refreshToken: string;
    expiresAt: Date;
  };
}

export interface VerificationResult {
  success: boolean;
  message: string;
}

export interface RefreshResult {
  success: boolean;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ForgotPasswordResult {
  success: boolean;
  message: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
}

// Custom Errors
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Extended Express Request
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}
// PATH: backend/src/auth/services/AuthService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SessionInfo {
  ipAddress: string;
  userAgent: string;
}

export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  message: string;
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'ecolojia-jwt-secret-2024';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Inscription utilisateur avec validation email
   */
  async register(registerData: RegisterData, sessionInfo: SessionInfo): Promise<AuthResult> {
    try {
      // Vérifier si email existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: registerData.email }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'Un compte existe déjà avec cet email'
        };
      }

      // Hash du mot de passe
      const passwordHash = await bcrypt.hash(registerData.password, 12);

      // Créer utilisateur avec timestamps par défaut
      const user = await prisma.user.create({
        data: {
          email: registerData.email,
          passwordHash,
          name: registerData.name,
          tier: 'free',
          emailVerified: false,
          // ✅ Les timestamps sont gérés automatiquement par Prisma
          quotas: {
            scansPerMonth: 30,
            aiQuestionsPerDay: 0,
            exportsPerMonth: 0
          },
          currentUsage: {
            scansThisMonth: 0,
            aiQuestionsToday: 0,
            exportsThisMonth: 0
          }
        }
      });

      // Générer token JWT
      const token = this.generateJWT(user.id, user.email);
      const refreshToken = this.generateRefreshToken();

      // Créer session avec timestamps par défaut
      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
          // ✅ createdAt et isActive ont des valeurs par défaut dans Prisma
        }
      });

      // Créer token de validation email
      const emailToken = this.generateEmailValidationToken();
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          email: user.email,
          token: emailToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        }
      });

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        message: 'Inscription réussie. Vérifiez votre email pour activer votre compte.'
      };

    } catch (error: any) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'inscription'
      };
    }
  }

  /**
   * Connexion utilisateur
   */
  async login(loginData: LoginData, sessionInfo: SessionInfo): Promise<AuthResult> {
    try {
      // Rechercher utilisateur par email
      const user = await prisma.user.findUnique({
        where: { email: loginData.email }
      });

      if (!user) {
        return {
          success: false,
          message: 'Email ou mot de passe incorrect'
        };
      }

      // Vérifier mot de passe
      const passwordMatch = await bcrypt.compare(loginData.password, user.passwordHash);
      if (!passwordMatch) {
        return {
          success: false,
          message: 'Email ou mot de passe incorrect'
        };
      }

      // Générer token JWT
      const token = this.generateJWT(user.id, user.email);
      const refreshToken = this.generateRefreshToken();

      // Invalider anciennes sessions
      await prisma.userSession.updateMany({
        where: { userId: user.id },
        data: { isActive: false }
      });

      // Créer nouvelle session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        }
      });

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        message: 'Connexion réussie'
      };

    } catch (error: any) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        message: 'Erreur lors de la connexion'
      };
    }
  }

  /**
   * Déconnexion utilisateur
   */
  async logout(token: string): Promise<AuthResult> {
    try {
      // Invalider la session
      await prisma.userSession.updateMany({
        where: { token },
        data: { isActive: false }
      });

      return {
        success: true,
        message: 'Déconnexion réussie'
      };

    } catch (error: any) {
      console.error('❌ Logout error:', error);
      return {
        success: false,
        message: 'Erreur lors de la déconnexion'
      };
    }
  }

  /**
   * Récupérer utilisateur par token JWT
   */
  async getUserFromToken(token: string): Promise<any | null> {
    try {
      // Vérifier token JWT
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Vérifier session active
      const session = await prisma.userSession.findFirst({
        where: {
          token,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      if (!session) {
        return null;
      }

      // Récupérer utilisateur
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      return user ? this.sanitizeUser(user) : null;

    } catch (error) {
      return null;
    }
  }

  // === MÉTHODES UTILITAIRES ===

  // ✅ CORRECTION COMPLÈTE
private generateJWT(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    this.jwtSecret,
    { expiresIn: '7d' }
  );
}

  private generateRefreshToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private generateEmailValidationToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
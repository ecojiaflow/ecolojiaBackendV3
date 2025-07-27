// import { PrismaClient, User, UserTier } from '@prisma/client';

const prisma = null // new PrismaClient();

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  tier?: UserTier;
  emailVerified?: boolean;
  preferences?: any;
  quotas?: any;
  currentUsage?: any;
}

export class UserRepository {
  
  async create(userData: CreateUserData): Promise<User> {
    return await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        passwordHash: userData.passwordHash,
        name: userData.name,
        tier: userData.tier || 'free',
        emailVerified: userData.emailVerified || false,
        preferences: userData.preferences || {
          language: 'fr',
          notifications: true,
          darkMode: false
        },
        quotas: userData.quotas || {
          scansPerMonth: 20,
          aiQuestionsPerDay: 0,
          exportsPerMonth: 0
        },
        currentUsage: userData.currentUsage || {
          scansThisMonth: 0,
          aiQuestionsToday: 0,
          exportsThisMonth: 0,
          lastResetDate: new Date()
        }
      }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  async updateEmailVerified(id: string, verified: boolean): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { emailVerified: verified }
    });
  }

  async updateLastLogin(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() }
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });
  }
}

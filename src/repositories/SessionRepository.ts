// import { PrismaClient, UserSession } from '@prisma/client';

const prisma = null // new PrismaClient();

export interface CreateSessionData {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
}

export class SessionRepository {
  
  async create(sessionData: CreateSessionData): Promise<UserSession> {
    return await prisma.userSession.create({
      data: sessionData
    });
  }

  async findByToken(token: string): Promise<UserSession | null> {
    return await prisma.userSession.findUnique({
      where: { token }
    });
  }

  async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    return await prisma.userSession.findUnique({
      where: { refreshToken }
    });
  }

  async updateTokens(id: string, tokens: { token: string; refreshToken: string }): Promise<UserSession> {
    return await prisma.userSession.update({
      where: { id },
      data: tokens
    });
  }

  async deactivate(id: string): Promise<UserSession> {
    return await prisma.userSession.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async deactivateAllForUser(userId: string): Promise<{ count: number }> {
    return await prisma.userSession.updateMany({
      where: { userId },
      data: { isActive: false }
    });
  }
}

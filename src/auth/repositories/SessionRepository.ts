// ðŸ”´ BACKEND - backend/src/auth/repositories/SessionRepository.ts

import { Session } from '../types/AuthTypes';
import { v4 as uuidv4 } from 'uuid';

export class SessionRepository {
  private sessions: Map<string, Session> = new Map();

  async create(sessionData: Omit<Session, 'id'>): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      ...sessionData
    };
    
    this.sessions.set(session.id, session);
    return session;
  }

  async findByToken(token: string): Promise<Session | null> {
    for (const session of this.sessions.values()) {
      if (session.token === token && session.isActive) {
        return session;
      }
    }
    return null;
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    for (const session of this.sessions.values()) {
      if (session.refreshToken === refreshToken && session.isActive) {
        return session;
      }
    }
    return null;
  }

  async updateTokens(sessionId: string, tokens: { token: string; refreshToken: string }): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.token = tokens.token;
      session.refreshToken = tokens.refreshToken;
      this.sessions.set(sessionId, session);
    }
  }

  async deactivate(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
    }
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        session.isActive = false;
        this.sessions.set(id, session);
      }
    }
  }


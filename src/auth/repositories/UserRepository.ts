// ðŸ”´ BACKEND - backend/src/auth/repositories/UserRepository.ts

import { User } from '../types/AuthTypes';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  private users: Map<string, User> = new Map();

  async create(userData: Omit<User, 'id'>): Promise<User> {
    const user: User = {
      id: uuidv4(),
      ...userData
    };
    
    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async updateLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(id, user);
    }
  }

  async updateEmailVerified(id: string, verified: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.emailVerified = verified;
      this.users.set(id, user);
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.passwordHash = passwordHash;
      this.users.set(id, user);
    }
  }


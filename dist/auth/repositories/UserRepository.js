"use strict";
// 🔴 BACKEND - backend/src/auth/repositories/UserRepository.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const uuid_1 = require("uuid");
class UserRepository {
    constructor() {
        this.users = new Map();
    }
    async create(userData) {
        const user = {
            id: (0, uuid_1.v4)(),
            ...userData
        };
        this.users.set(user.id, user);
        return user;
    }
    async findById(id) {
        return this.users.get(id) || null;
    }
    async findByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }
    async updateLastLogin(id) {
        const user = this.users.get(id);
        if (user) {
            user.lastLoginAt = new Date();
            this.users.set(id, user);
        }
    }
    async updateEmailVerified(id, verified) {
        const user = this.users.get(id);
        if (user) {
            user.emailVerified = verified;
            this.users.set(id, user);
        }
    }
    async updatePassword(id, passwordHash) {
        const user = this.users.get(id);
        if (user) {
            user.passwordHash = passwordHash;
            this.users.set(id, user);
        }
    }
}
exports.UserRepository = UserRepository;

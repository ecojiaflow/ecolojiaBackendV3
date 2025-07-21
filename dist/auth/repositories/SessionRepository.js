"use strict";
// 🔴 BACKEND - backend/src/auth/repositories/SessionRepository.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const uuid_1 = require("uuid");
class SessionRepository {
    constructor() {
        this.sessions = new Map();
    }
    async create(sessionData) {
        const session = {
            id: (0, uuid_1.v4)(),
            ...sessionData
        };
        this.sessions.set(session.id, session);
        return session;
    }
    async findByToken(token) {
        for (const session of this.sessions.values()) {
            if (session.token === token && session.isActive) {
                return session;
            }
        }
        return null;
    }
    async findByRefreshToken(refreshToken) {
        for (const session of this.sessions.values()) {
            if (session.refreshToken === refreshToken && session.isActive) {
                return session;
            }
        }
        return null;
    }
    async updateTokens(sessionId, tokens) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.token = tokens.token;
            session.refreshToken = tokens.refreshToken;
            this.sessions.set(sessionId, session);
        }
    }
    async deactivate(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isActive = false;
            this.sessions.set(sessionId, session);
        }
    }
    async deactivateAllForUser(userId) {
        for (const [id, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                session.isActive = false;
                this.sessions.set(id, session);
            }
        }
    }
}
exports.SessionRepository = SessionRepository;

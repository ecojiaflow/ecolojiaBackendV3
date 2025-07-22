"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SessionRepository {
    async create(sessionData) {
        return await prisma.userSession.create({
            data: sessionData
        });
    }
    async findByToken(token) {
        return await prisma.userSession.findUnique({
            where: { token }
        });
    }
    async findByRefreshToken(refreshToken) {
        return await prisma.userSession.findUnique({
            where: { refreshToken }
        });
    }
    async updateTokens(id, tokens) {
        return await prisma.userSession.update({
            where: { id },
            data: tokens
        });
    }
    async deactivate(id) {
        return await prisma.userSession.update({
            where: { id },
            data: { isActive: false }
        });
    }
    async deactivateAllForUser(userId) {
        return await prisma.userSession.updateMany({
            where: { userId },
            data: { isActive: false }
        });
    }
}
exports.SessionRepository = SessionRepository;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UserRepository {
    async create(userData) {
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
    async findByEmail(email) {
        return await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
    }
    async findById(id) {
        return await prisma.user.findUnique({
            where: { id }
        });
    }
    async updateEmailVerified(id, verified) {
        return await prisma.user.update({
            where: { id },
            data: { emailVerified: verified }
        });
    }
    async updateLastLogin(id) {
        return await prisma.user.update({
            where: { id },
            data: { lastLoginAt: new Date() }
        });
    }
    async updatePassword(id, passwordHash) {
        return await prisma.user.update({
            where: { id },
            data: { passwordHash }
        });
    }
}
exports.UserRepository = UserRepository;

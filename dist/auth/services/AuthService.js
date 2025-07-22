"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
// PATH: backend/src/auth/services/AuthService.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'ecolojia-jwt-secret-2024';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    }
    /**
     * Inscription utilisateur avec validation email
     */
    async register(registerData, sessionInfo) {
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
            const passwordHash = await bcryptjs_1.default.hash(registerData.password, 12);
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
        }
        catch (error) {
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
    async login(loginData, sessionInfo) {
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
            const passwordMatch = await bcryptjs_1.default.compare(loginData.password, user.passwordHash);
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
        }
        catch (error) {
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
    async logout(token) {
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
        }
        catch (error) {
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
    async getUserFromToken(token) {
        try {
            // Vérifier token JWT
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
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
        }
        catch (error) {
            return null;
        }
    }
    // === MÉTHODES UTILITAIRES ===
    // ✅ CORRECTION COMPLÈTE
    generateJWT(userId, email) {
        return jsonwebtoken_1.default.sign({ userId, email }, this.jwtSecret, { expiresIn: '7d' });
    }
    generateRefreshToken() {
        return require('crypto').randomBytes(32).toString('hex');
    }
    generateEmailValidationToken() {
        return require('crypto').randomBytes(32).toString('hex');
    }
    sanitizeUser(user) {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();

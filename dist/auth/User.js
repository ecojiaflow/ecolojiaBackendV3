"use strict";
// backend/src/auth/
// Structure complète système authentification
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = exports.AuthService = void 0;
// ===== SERVICES =====
// backend/src/auth/services/AuthService.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class AuthService {
    constructor(userRepository, sessionRepository, emailService, logger) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.emailService = emailService;
        this.logger = logger;
    }
    async register(registerData) {
        this.logger.info('Starting user registration', { email: registerData.email });
        try {
            // 1. Validation
            this.validateRegisterData(registerData);
            // 2. Vérifier si email existe déjà
            const existingUser = await this.userRepository.findByEmail(registerData.email);
            if (existingUser) {
                throw new AuthError('USER_ALREADY_EXISTS', 'Un compte existe déjà avec cet email');
            }
            // 3. Hash password
            const passwordHash = await bcrypt_1.default.hash(registerData.password, 12);
            // 4. Créer utilisateur
            const user = {
                email: registerData.email.toLowerCase(),
                passwordHash,
                name: registerData.name,
                tier: 'free',
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                preferences: {
                    language: 'fr',
                    notifications: true,
                    darkMode: false
                },
                quotas: {
                    scansPerMonth: 30,
                    aiQuestionsPerDay: 5,
                    exportsPerMonth: 0
                },
                currentUsage: {
                    scansThisMonth: 0,
                    aiQuestionsToday: 0,
                    exportsThisMonth: 0,
                    lastResetDate: new Date()
                }
            };
            const createdUser = await this.userRepository.create(user);
            // 5. Générer token de vérification email
            const verificationToken = this.generateVerificationToken(createdUser.id);
            // 6. Envoyer email de vérification
            await this.emailService.sendVerificationEmail(createdUser.email, createdUser.name, verificationToken);
            this.logger.info('User registered successfully', {
                userId: createdUser.id,
                email: createdUser.email
            });
            return {
                success: true,
                userId: createdUser.id,
                message: 'Compte créé avec succès. Vérifiez votre email pour activer votre compte.'
            };
        }
        catch (error) {
            this.logger.error('Registration failed', {
                email: registerData.email,
                error: error.message
            });
            throw error;
        }
    }
    async login(loginData, sessionInfo) {
        this.logger.info('Starting user login', { email: loginData.email });
        try {
            // 1. Validation
            this.validateLoginData(loginData);
            // 2. Trouver utilisateur
            const user = await this.userRepository.findByEmail(loginData.email);
            if (!user) {
                throw new AuthError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
            }
            // 3. Vérifier mot de passe
            const isPasswordValid = await bcrypt_1.default.compare(loginData.password, user.passwordHash);
            if (!isPasswordValid) {
                throw new AuthError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
            }
            // 4. Vérifier email vérifié
            if (!user.emailVerified) {
                throw new AuthError('EMAIL_NOT_VERIFIED', 'Veuillez vérifier votre email avant de vous connecter');
            }
            // 5. Créer session
            const session = await this.createSession(user.id, sessionInfo);
            // 6. Mettre à jour last login
            await this.userRepository.updateLastLogin(user.id);
            this.logger.info('User logged in successfully', {
                userId: user.id,
                sessionId: session.id
            });
            return {
                success: true,
                user: this.sanitizeUser(user),
                session: {
                    token: session.token,
                    refreshToken: session.refreshToken,
                    expiresAt: session.expiresAt
                }
            };
        }
        catch (error) {
            this.logger.error('Login failed', {
                email: loginData.email,
                error: error.message
            });
            throw error;
        }
    }
    async verifyEmail(token) {
        try {
            // 1. Décoder et valider token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // 2. Trouver utilisateur
            const user = await this.userRepository.findById(decoded.userId);
            if (!user) {
                throw new AuthError('INVALID_TOKEN', 'Token de vérification invalide');
            }
            // 3. Vérifier si déjà vérifié
            if (user.emailVerified) {
                return {
                    success: true,
                    message: 'Email déjà vérifié'
                };
            }
            // 4. Marquer comme vérifié
            await this.userRepository.updateEmailVerified(user.id, true);
            this.logger.info('Email verified successfully', { userId: user.id });
            return {
                success: true,
                message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.'
            };
        }
        catch (error) {
            this.logger.error('Email verification failed', { error: error.message });
            throw new AuthError('INVALID_TOKEN', 'Token de vérification invalide ou expiré');
        }
    }
    async refreshToken(refreshToken) {
        try {
            // 1. Trouver session
            const session = await this.sessionRepository.findByRefreshToken(refreshToken);
            if (!session || !session.isActive) {
                throw new AuthError('INVALID_REFRESH_TOKEN', 'Token de rafraîchissement invalide');
            }
            // 2. Vérifier expiration
            if (session.expiresAt < new Date()) {
                await this.sessionRepository.deactivate(session.id);
                throw new AuthError('REFRESH_TOKEN_EXPIRED', 'Token de rafraîchissement expiré');
            }
            // 3. Générer nouveaux tokens
            const newTokens = this.generateTokens(session.userId);
            // 4. Mettre à jour session
            await this.sessionRepository.updateTokens(session.id, newTokens);
            return {
                success: true,
                token: newTokens.token,
                refreshToken: newTokens.refreshToken,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
            };
        }
        catch (error) {
            this.logger.error('Token refresh failed', { error: error.message });
            throw error;
        }
    }
    async logout(token) {
        try {
            const session = await this.sessionRepository.findByToken(token);
            if (session) {
                await this.sessionRepository.deactivate(session.id);
                this.logger.info('User logged out', { sessionId: session.id });
            }
        }
        catch (error) {
            this.logger.error('Logout failed', { error: error.message });
        }
    }
    async forgotPassword(email) {
        try {
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                // Ne pas révéler si l'email existe ou non
                return {
                    success: true,
                    message: 'Si cet email existe, vous recevrez un lien de réinitialisation.'
                };
            }
            // Générer token de reset
            const resetToken = this.generateResetToken(user.id);
            // Envoyer email
            await this.emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
            this.logger.info('Password reset email sent', { userId: user.id });
            return {
                success: true,
                message: 'Si cet email existe, vous recevrez un lien de réinitialisation.'
            };
        }
        catch (error) {
            this.logger.error('Forgot password failed', { error: error.message });
            throw error;
        }
    }
    async resetPassword(token, newPassword) {
        try {
            // 1. Décoder token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // 2. Valider nouveau mot de passe
            this.validatePassword(newPassword);
            // 3. Hash nouveau mot de passe
            const passwordHash = await bcrypt_1.default.hash(newPassword, 12);
            // 4. Mettre à jour en base
            await this.userRepository.updatePassword(decoded.userId, passwordHash);
            // 5. Déconnecter toutes les sessions
            await this.sessionRepository.deactivateAllForUser(decoded.userId);
            this.logger.info('Password reset successfully', { userId: decoded.userId });
            return {
                success: true,
                message: 'Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.'
            };
        }
        catch (error) {
            this.logger.error('Password reset failed', { error: error.message });
            throw new AuthError('INVALID_TOKEN', 'Token de réinitialisation invalide ou expiré');
        }
    }
    // ===== MÉTHODES PRIVÉES =====
    validateRegisterData(data) {
        if (!data.email || !this.isValidEmail(data.email)) {
            throw new AuthError('INVALID_EMAIL', 'Email invalide');
        }
        if (!data.password || data.password.length < 8) {
            throw new AuthError('WEAK_PASSWORD', 'Le mot de passe doit contenir au moins 8 caractères');
        }
        if (!data.name || data.name.trim().length < 2) {
            throw new AuthError('INVALID_NAME', 'Le nom doit contenir au moins 2 caractères');
        }
    }
    validateLoginData(data) {
        if (!data.email || !this.isValidEmail(data.email)) {
            throw new AuthError('INVALID_EMAIL', 'Email invalide');
        }
        if (!data.password) {
            throw new AuthError('MISSING_PASSWORD', 'Mot de passe requis');
        }
    }
    validatePassword(password) {
        if (!password || password.length < 8) {
            throw new AuthError('WEAK_PASSWORD', 'Le mot de passe doit contenir au moins 8 caractères');
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            throw new AuthError('WEAK_PASSWORD', 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre');
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    async createSession(userId, sessionInfo) {
        const tokens = this.generateTokens(userId);
        const session = {
            userId,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            createdAt: new Date(),
            ipAddress: sessionInfo.ipAddress,
            userAgent: sessionInfo.userAgent,
            isActive: true
        };
        return await this.sessionRepository.create(session);
    }
    generateTokens(userId) {
        const token = jsonwebtoken_1.default.sign({ userId, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '24h' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '30d' });
        return { token, refreshToken };
    }
    generateVerificationToken(userId) {
        return jsonwebtoken_1.default.sign({ userId, type: 'verification' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    }
    generateResetToken(userId) {
        return jsonwebtoken_1.default.sign({ userId, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }
    sanitizeUser(user) {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }
}
exports.AuthService = AuthService;
class AuthError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;

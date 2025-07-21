"use strict";
// 🔴 BACKEND - backend/src/auth/services/AuthService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
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
    // ... autres méthodes (verifyEmail, refreshToken, etc.)
    // Copiez le reste depuis l'artifact "auth-backend-structure"
    sanitizeUser(user) {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }
}
exports.AuthService = AuthService;

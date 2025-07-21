"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationMiddleware = exports.createAuthRoutes = exports.RateLimitError = exports.RateLimiter = exports.AuthMiddleware = exports.AuthController = void 0;
class AuthController {
    constructor(authService, rateLimiter) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
    }
    async register(req, res) {
        try {
            // Rate limiting pour registration
            await this.rateLimiter.checkLimit(req.ip, 'register', 5, 3600); // 5 par heure
            const { email, password, name } = req.body;
            const result = await this.authService.register({
                email,
                password,
                name
            });
            res.status(201).json({
                success: true,
                data: result,
                message: 'Compte créé avec succès'
            });
        }
        catch (error) {
            this.handleAuthError(error, res);
        }
    }
    async login(req, res) {
        try {
            // Rate limiting pour login
            await this.rateLimiter.checkLimit(req.ip, 'login', 10, 900); // 10 par 15min
            const { email, password } = req.body;
            const sessionInfo = {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent') || 'Unknown'
            };
            const result = await this.authService.login({ email, password }, sessionInfo);
            // Set secure HTTP-only cookie pour refresh token
            res.cookie('refreshToken', result.session.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
            });
            res.status(200).json({
                success: true,
                data: {
                    user: result.user,
                    token: result.session.token,
                    expiresAt: result.session.expiresAt
                },
                message: 'Connexion réussie'
            });
        }
        catch (error) {
            this.handleAuthError(error, res);
        }
    }
    async verifyEmail(req, res) {
        try {
            const { token } = req.params;
            const result = await this.authService.verifyEmail(token);
            res.status(200).json({
                success: true,
                data: result,
                message: result.message
            });
        }
        catch (error) {
            this.handleAuthError(error, res);
        }
    }
    async refreshToken(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    error: 'MISSING_REFRESH_TOKEN',
                    message: 'Token de rafraîchissement manquant'
                });
            }
            const result = await this.authService.refreshToken(refreshToken);
            // Mettre à jour le cookie
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });
            res.status(200).json({
                success: true,
                data: {
                    token: result.token,
                    expiresAt: result.expiresAt
                }
            });
        }
        catch (error) {
            this.handleAuthError(error, res);
        }
    }
    async logout(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                await this.authService.logout(token);
            }
            // Clear refresh token cookie
            res.clearCookie('refreshToken');
            res.status(200).json({
                success: true,
                message: 'Déconnexion réussie'
            });
        }
        catch (error) {
            this.handleAuthError(error, res);
        }
    }
    async forgotPassword(req, res) {
        try {
            // Rate limiting pour forgot password
            await this.rateLimiter.checkLimit(req.ip, 'forgot-password', 3, 3600); // 3 par heure
            const { email } = req.body;
            const result = await this.authService.forgotPassword(email);
            res.status(200).json({
                success: true,
                data: result,
                message: result.message
            });
        }
        catch (error) {
            this.handleAuthError(error, res);
        }
    }
    async resetPassword(req, res) {
        try {
            const { token } = req.params;
            const { password } = req.body;
            const result = await this.authService.resetPassword(token, password);
            res.status(200).json({
                success: true,
                data: result,
                message: result.message
            });
        }
        catch (error) {
            this.handleAuthError(error, res);
        }
    }
    async getProfile(req, res) {
        try {
            // L'utilisateur est déjà dans req.user grâce au middleware auth
            const user = req.user;
            res.status(200).json({
                success: true,
                data: { user },
                message: 'Profil récupéré avec succès'
            });
        }
        catch (error) {
            this.handleAuthError(error, res);
        }
    }
    handleAuthError(error, res) {
        if (error.name === 'AuthError') {
            const statusMap = {
                'USER_ALREADY_EXISTS': 409,
                'INVALID_CREDENTIALS': 401,
                'EMAIL_NOT_VERIFIED': 403,
                'INVALID_TOKEN': 401,
                'REFRESH_TOKEN_EXPIRED': 401,
                'INVALID_EMAIL': 400,
                'WEAK_PASSWORD': 400,
                'INVALID_NAME': 400,
                'MISSING_PASSWORD': 400
            };
            const status = statusMap[error.code] || 400;
            res.status(status).json({
                success: false,
                error: error.code,
                message: error.message
            });
            return;
        }
        // Erreur serveur
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_SERVER_ERROR',
            message: 'Erreur interne du serveur'
        });
    }
}
exports.AuthController = AuthController;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class AuthMiddleware {
    constructor(userRepository) {
        // Middleware pour vérifier l'authentification
        this.authenticate = async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    res.status(401).json({
                        success: false,
                        error: 'MISSING_TOKEN',
                        message: 'Token d\'authentification manquant'
                    });
                    return;
                }
                const token = authHeader.replace('Bearer ', '');
                // Vérifier le token JWT
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                // Récupérer l'utilisateur
                const user = await this.userRepository.findById(decoded.userId);
                if (!user) {
                    res.status(401).json({
                        success: false,
                        error: 'USER_NOT_FOUND',
                        message: 'Utilisateur introuvable'
                    });
                    return;
                }
                if (!user.emailVerified) {
                    res.status(403).json({
                        success: false,
                        error: 'EMAIL_NOT_VERIFIED',
                        message: 'Email non vérifié'
                    });
                    return;
                }
                // Ajouter l'utilisateur à la requête
                req.user = user;
                next();
            }
            catch (error) {
                if (error.name === 'JsonWebTokenError') {
                    res.status(401).json({
                        success: false,
                        error: 'INVALID_TOKEN',
                        message: 'Token invalide'
                    });
                    return;
                }
                if (error.name === 'TokenExpiredError') {
                    res.status(401).json({
                        success: false,
                        error: 'TOKEN_EXPIRED',
                        message: 'Token expiré'
                    });
                    return;
                }
                console.error('Auth middleware error:', error);
                res.status(500).json({
                    success: false,
                    error: 'INTERNAL_SERVER_ERROR',
                    message: 'Erreur interne'
                });
            }
        };
        // Middleware pour vérifier le tier Premium
        this.requirePremium = (req, res, next) => {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'NOT_AUTHENTICATED',
                    message: 'Authentification requise'
                });
                return;
            }
            if (user.tier !== 'premium') {
                res.status(403).json({
                    success: false,
                    error: 'PREMIUM_REQUIRED',
                    message: 'Abonnement Premium requis pour cette fonctionnalité'
                });
                return;
            }
            next();
        };
        // Middleware optionnel (ajoute user si token présent)
        this.optionalAuth = async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    next();
                    return;
                }
                const token = authHeader.replace('Bearer ', '');
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                const user = await this.userRepository.findById(decoded.userId);
                if (user && user.emailVerified) {
                    req.user = user;
                }
            }
            catch (error) {
                // En cas d'erreur, on continue sans utilisateur
                console.log('Optional auth failed:', error.message);
            }
            next();
        };
        this.userRepository = userRepository;
    }
}
exports.AuthMiddleware = AuthMiddleware;
class RateLimiter {
    constructor(redis) {
        this.redis = redis;
    }
    async checkLimit(identifier, action, maxRequests, windowSeconds) {
        const key = `rate_limit:${action}:${identifier}`;
        const current = await this.redis.incr(key);
        if (current === 1) {
            // Premier appel, définir TTL
            await this.redis.expire(key, windowSeconds);
        }
        if (current > maxRequests) {
            const ttl = await this.redis.ttl(key);
            throw new RateLimitError(`Trop de tentatives. Réessayez dans ${ttl} secondes.`, ttl);
        }
    }
}
exports.RateLimiter = RateLimiter;
class RateLimitError extends Error {
    constructor(message, retryAfter) {
        super(message);
        this.retryAfter = retryAfter;
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
// ===== ROUTES =====
// backend/src/auth/routes/authRoutes.ts
const express_1 = require("express");
const createAuthRoutes = (authController, authMiddleware, validationMiddleware) => {
    const router = (0, express_1.Router)();
    // Routes publiques
    router.post('/register', validationMiddleware.validateRegister, authController.register.bind(authController));
    router.post('/login', validationMiddleware.validateLogin, authController.login.bind(authController));
    router.get('/verify-email/:token', authController.verifyEmail.bind(authController));
    router.post('/refresh-token', authController.refreshToken.bind(authController));
    router.post('/forgot-password', validationMiddleware.validateForgotPassword, authController.forgotPassword.bind(authController));
    router.post('/reset-password/:token', validationMiddleware.validateResetPassword, authController.resetPassword.bind(authController));
    // Routes protégées
    router.post('/logout', authMiddleware.authenticate, authController.logout.bind(authController));
    router.get('/profile', authMiddleware.authenticate, authController.getProfile.bind(authController));
    return router;
};
exports.createAuthRoutes = createAuthRoutes;
const joi_1 = __importDefault(require("joi"));
class ValidationMiddleware {
    constructor() {
        this.validateRegister = (req, res, next) => {
            const schema = joi_1.default.object({
                email: joi_1.default.string().email().required().messages({
                    'string.email': 'Email invalide',
                    'any.required': 'Email requis'
                }),
                password: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
                    'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
                    'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
                    'any.required': 'Mot de passe requis'
                }),
                name: joi_1.default.string().min(2).max(50).required().messages({
                    'string.min': 'Le nom doit contenir au moins 2 caractères',
                    'string.max': 'Le nom ne peut pas dépasser 50 caractères',
                    'any.required': 'Nom requis'
                })
            });
            const { error } = schema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: error.details[0].message
                });
                return;
            }
            next();
        };
        this.validateLogin = (req, res, next) => {
            const schema = joi_1.default.object({
                email: joi_1.default.string().email().required(),
                password: joi_1.default.string().required()
            });
            const { error } = schema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: error.details[0].message
                });
                return;
            }
            next();
        };
        this.validateForgotPassword = (req, res, next) => {
            const schema = joi_1.default.object({
                email: joi_1.default.string().email().required()
            });
            const { error } = schema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: error.details[0].message
                });
                return;
            }
            next();
        };
        this.validateResetPassword = (req, res, next) => {
            const schema = joi_1.default.object({
                password: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
            });
            const { error } = schema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: error.details[0].message
                });
                return;
            }
            next();
        };
    }
}
exports.ValidationMiddleware = ValidationMiddleware;

"use strict";
// backend/src/middleware/auth.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.optionalAuth = exports.requireVerifiedEmail = exports.requirePremium = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SessionCache_1 = require("../services/cache/SessionCache");
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger('AuthMiddleware');
/**
 * Middleware d'authentification avec cache Redis
 */
const authenticate = async (req, res, next) => {
    try {
        // 1. Extraire le token du header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Token d\'authentification manquant'
            });
            return;
        }
        const token = authHeader.substring(7);
        req.token = token;
        // 2. Vérifier la session dans le cache Redis (ULTRA RAPIDE)
        const startTime = Date.now();
        const session = await SessionCache_1.sessionCache.getSession(token);
        const cacheTime = Date.now() - startTime;
        if (session && session.isActive) {
            // Cache HIT - Session trouvée et valide
            req.user = session.user;
            logger.info(`✅ Auth Cache HIT (${cacheTime}ms) - User: ${session.user.email}`);
            next();
            return;
        }
        // 3. Cache MISS - Vérifier le JWT
        logger.info(`❌ Auth Cache MISS - Vérification JWT`);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // 4. Récupérer l'utilisateur de la base de données
        const User = require('../models/User').default;
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
            return;
        }
        // 5. Créer une nouvelle session en cache
        await SessionCache_1.sessionCache.createSession(token, {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            tier: user.tier || 'free',
            isEmailVerified: user.isEmailVerified || false
        });
        req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            tier: user.tier || 'free',
            isEmailVerified: user.isEmailVerified || false
        };
        const totalTime = Date.now() - startTime;
        logger.info(`⏱️ Auth total time: ${totalTime}ms (DB lookup required)`);
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                message: 'Token expiré'
            });
            return;
        }
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({
                success: false,
                message: 'Token invalide'
            });
            return;
        }
        logger.error('❌ Erreur authentification:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'authentification'
        });
    }
};
exports.authenticate = authenticate;
/**
 * Middleware pour vérifier si l'utilisateur est Premium
 */
const requirePremium = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentification requise'
        });
        return;
    }
    if (req.user.tier !== 'premium') {
        res.status(403).json({
            success: false,
            message: 'Accès réservé aux utilisateurs Premium',
            requiredTier: 'premium',
            userTier: req.user.tier
        });
        return;
    }
    next();
};
exports.requirePremium = requirePremium;
/**
 * Middleware pour vérifier si l'email est vérifié
 */
const requireVerifiedEmail = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentification requise'
        });
        return;
    }
    if (!req.user.isEmailVerified) {
        res.status(403).json({
            success: false,
            message: 'Veuillez vérifier votre adresse email',
            emailVerified: false
        });
        return;
    }
    next();
};
exports.requireVerifiedEmail = requireVerifiedEmail;
/**
 * Middleware optionnel - Authentifie si token présent, sinon continue
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Pas de token, continuer sans authentification
        next();
        return;
    }
    // Si token présent, tenter l'authentification
    (0, exports.authenticate)(req, res, (err) => {
        if (err) {
            // Erreur d'authentification, continuer sans user
            req.user = undefined;
        }
        next();
    });
};
exports.optionalAuth = optionalAuth;
/**
 * Déconnecter l'utilisateur (invalider la session)
 */
const logout = async (req, res) => {
    try {
        if (req.token) {
            await SessionCache_1.sessionCache.invalidateSession(req.token);
            logger.info(`🚪 User logged out: ${req.user?.email}`);
        }
        res.json({
            success: true,
            message: 'Déconnexion réussie'
        });
    }
    catch (error) {
        logger.error('❌ Erreur logout:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la déconnexion'
        });
    }
};
exports.logout = logout;

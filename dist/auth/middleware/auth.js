"use strict";
// backend/src/auth/middleware/auth.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVerifiedEmail = exports.requirePremium = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../../models/User"));
/**
 * Middleware d'authentification simple
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Token d\'authentification manquant'
            });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User_1.default.findById(decoded.userId).select('-password');
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
            return;
        }
        // Assigner l'utilisateur avec le bon type
        req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            tier: user.tier || 'free',
            isEmailVerified: user.isEmailVerified || false
        };
        console.log(`[AUTH] User authenticated: ${user.email}`);
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
        console.error('[AUTH ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.authenticate = authenticate;
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
            message: 'Accès réservé aux utilisateurs Premium'
        });
        return;
    }
    next();
};
exports.requirePremium = requirePremium;
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
            message: 'Veuillez vérifier votre adresse email'
        });
        return;
    }
    next();
};
exports.requireVerifiedEmail = requireVerifiedEmail;
exports.default = exports.authenticate;

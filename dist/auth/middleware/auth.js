"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requirePremium = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const Logger_1 = require("../../utils/Logger");
const log = new Logger_1.Logger('AuthMiddleware');
// Middleware d'authentification principal
const authenticate = async (req, res, next) => {
    try {
        // Récupération du token depuis le header Authorization
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Token d\'authentification requis',
                code: 'NO_TOKEN'
            });
            return;
        }
        // Vérification du token
        const decoded = await (0, jwt_1.verifyToken)(token);
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: 'Token invalide ou expiré',
                code: 'INVALID_TOKEN'
            });
            return;
        }
        // Ajout des informations utilisateur à la requête
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            tier: decoded.tier || 'free'
        };
        log.info(`Utilisateur authentifié: ${decoded.email}`);
        next();
    }
    catch (error) {
        log.error('Erreur authentification:', error);
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                message: 'Token expiré',
                code: 'TOKEN_EXPIRED'
            });
            return;
        }
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({
                success: false,
                message: 'Token invalide',
                code: 'INVALID_TOKEN'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'authentification',
            code: 'AUTH_ERROR'
        });
    }
};
exports.authenticate = authenticate;
// Middleware pour vérifier si l'utilisateur est premium
const requirePremium = async (req, res, next) => {
    const authReq = req;
    if (!authReq.user) {
        res.status(401).json({
            success: false,
            message: 'Authentification requise',
            code: 'NOT_AUTHENTICATED'
        });
        return;
    }
    if (authReq.user.tier !== 'premium') {
        res.status(403).json({
            success: false,
            message: 'Abonnement Premium requis',
            code: 'PREMIUM_REQUIRED'
        });
        return;
    }
    next();
};
exports.requirePremium = requirePremium;
// Middleware optionnel - authentifie si token présent mais ne bloque pas
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = await (0, jwt_1.verifyToken)(token);
            if (decoded) {
                req.user = {
                    id: decoded.userId,
                    email: decoded.email,
                    tier: decoded.tier || 'free'
                };
            }
        }
    }
    catch (error) {
        // Ignorer les erreurs - authentification optionnelle
        log.debug('Auth optionnelle échouée, continuer sans auth');
    }
    next();
};
exports.optionalAuth = optionalAuth;
exports.default = exports.authenticate;

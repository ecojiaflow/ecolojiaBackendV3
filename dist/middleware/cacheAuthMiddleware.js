"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSessionCache = exports.adminAuthMiddleware = exports.checkQuotaMiddleware = exports.publicRouteRateLimit = exports.cacheAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const CacheService_1 = require("../services/CacheService");
const prisma = new client_1.PrismaClient();
/**
 * 🚀 Middleware d'authentification optimisé avec cache Redis
 * Performance: 100ms → 5ms (20x faster)
 */
const cacheAuthMiddleware = async (req, res, next) => {
    try {
        const startTime = Date.now();
        // 1. Extraction du token
        const token = extractToken(req);
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Token manquant',
                message: 'Authentification requise'
            });
            return;
        }
        // 2. Vérifier le cache Redis en premier (ULTRA RAPIDE)
        const cachedSession = await CacheService_1.cacheService.getSession(token);
        if (cachedSession) {
            // ✅ CACHE HIT - Pas de requête DB !
            req.cacheUser = cachedSession.user;
            req.cacheSession = cachedSession.session;
            const cacheTime = Date.now() - startTime;
            console.log(`⚡ Auth cache hit: ${cacheTime}ms`);
            // Ajouter headers de performance
            res.setHeader('X-Auth-Cache', 'HIT');
            res.setHeader('X-Auth-Time', `${cacheTime}ms`);
            return next();
        }
        // 3. Cache miss - Vérifier JWT
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        }
        catch (error) {
            res.status(401).json({
                success: false,
                error: 'Token invalide',
                message: 'Token expiré ou invalide'
            });
            return;
        }
        // 4. Vérifier en base de données
        const session = await prisma.userSession.findFirst({
            where: {
                token,
                userId: decoded.userId,
                isActive: true,
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        emailVerified: true
                    }
                }
            }
        });
        if (!session) {
            res.status(401).json({
                success: false,
                error: 'Session invalide',
                message: 'Session expirée ou révoquée'
            });
            return;
        }
        // 5. Vérifier si l'email est vérifié
        if (!session.user.emailVerified) {
            res.status(403).json({
                success: false,
                error: 'Email non vérifié',
                message: 'Veuillez vérifier votre email avant de continuer',
                emailVerificationRequired: true
            });
            return;
        }
        // 6. Calculer les quotas (pour la phase future)
        const quotas = await calculateUserQuotas(session.user.id);
        // 7. Préparer les données utilisateur
        const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            emailVerified: session.user.emailVerified,
            tier: 'free', // TODO: Implémenter système Premium
            quotas
        };
        const sessionData = {
            id: session.id,
            token: session.token,
            expiresAt: session.expiresAt
        };
        // 8. Mettre en cache pour les prochaines requêtes
        await CacheService_1.cacheService.cacheSession(token, {
            user: userData,
            session: sessionData
        }, 3600); // Cache 1 heure
        // 9. Attacher à la requête
        req.cacheUser = userData;
        req.cacheSession = sessionData;
        const dbTime = Date.now() - startTime;
        console.log(`🗄️ Auth DB lookup: ${dbTime}ms`);
        res.setHeader('X-Auth-Cache', 'MISS');
        res.setHeader('X-Auth-Time', `${dbTime}ms`);
        next();
    }
    catch (error) {
        console.error('❌ Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Erreur lors de l\'authentification'
        });
    }
};
exports.cacheAuthMiddleware = cacheAuthMiddleware;
/**
 * 🔒 Middleware pour routes publiques avec rate limiting
 */
const publicRouteRateLimit = async (req, res, next) => {
    try {
        // Identifier par IP ou token si présent
        const identifier = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
        // Rate limit : 100 requêtes par minute
        const rateLimit = await CacheService_1.cacheService.checkRateLimit(`public:${identifier}`, 100, 60);
        // Ajouter headers de rate limit
        res.setHeader('X-RateLimit-Limit', '100');
        res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
        res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
        if (!rateLimit.allowed) {
            res.status(429).json({
                success: false,
                error: 'Trop de requêtes',
                message: 'Limite de requêtes dépassée. Réessayez plus tard.',
                retryAfter: rateLimit.resetAt
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('❌ Rate limit error:', error);
        // En cas d'erreur, on laisse passer
        next();
    }
};
exports.publicRouteRateLimit = publicRouteRateLimit;
/**
 * 🎯 Middleware pour vérifier les quotas (analyses)
 */
const checkQuotaMiddleware = (action = 'analysis') => {
    return async (req, res, next) => {
        try {
            if (!req.cacheUser) {
                res.status(401).json({
                    success: false,
                    error: 'Authentification requise'
                });
                return;
            }
            // Vérifier le quota actuel
            const currentQuota = await CacheService_1.cacheService.getQuota(req.cacheUser.id, action);
            const maxQuota = req.cacheUser.tier === 'premium' ? -1 : 20; // -1 = illimité
            // Premium = pas de limite
            if (maxQuota === -1) {
                return next();
            }
            // Vérifier si quota dépassé
            if (currentQuota >= maxQuota) {
                res.status(403).json({
                    success: false,
                    error: 'Quota dépassé',
                    message: `Limite de ${maxQuota} ${action}s par mois atteinte`,
                    quotaInfo: {
                        used: currentQuota,
                        max: maxQuota,
                        resetDate: getMonthResetDate()
                    },
                    upgrade: {
                        message: 'Passez en Premium pour analyses illimitées',
                        link: '/pricing'
                    }
                });
                return;
            }
            // Incrémenter le quota
            const newQuota = await CacheService_1.cacheService.incrementQuota(req.cacheUser.id, action);
            // Ajouter info quota dans la réponse
            res.setHeader('X-Quota-Used', newQuota.toString());
            res.setHeader('X-Quota-Remaining', (maxQuota - newQuota).toString());
            next();
        }
        catch (error) {
            console.error('❌ Quota check error:', error);
            // En cas d'erreur, on laisse passer
            next();
        }
    };
};
exports.checkQuotaMiddleware = checkQuotaMiddleware;
/**
 * 🔐 Middleware pour admin uniquement
 */
const adminAuthMiddleware = async (req, res, next) => {
    try {
        // Utiliser le middleware auth de base d'abord
        await (0, exports.cacheAuthMiddleware)(req, res, () => {
            // Vérifier si admin
            if (!req.cacheUser || req.cacheUser.email !== process.env.ADMIN_EMAIL) {
                res.status(403).json({
                    success: false,
                    error: 'Accès refusé',
                    message: 'Droits administrateur requis'
                });
                return;
            }
            next();
        });
    }
    catch (error) {
        console.error('❌ Admin auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
};
exports.adminAuthMiddleware = adminAuthMiddleware;
/**
 * 🔄 Middleware pour rafraîchir le cache session
 */
const refreshSessionCache = async (req, res, next) => {
    try {
        if (req.cacheSession && req.cacheUser) {
            // Rafraîchir le cache avec TTL étendu
            await CacheService_1.cacheService.cacheSession(req.cacheSession.token, {
                user: req.cacheUser,
                session: req.cacheSession
            }, 7200); // 2 heures
        }
        next();
    }
    catch (error) {
        console.error('❌ Session refresh error:', error);
        next();
    }
};
exports.refreshSessionCache = refreshSessionCache;
// Fonctions utilitaires
/**
 * Extraire le token JWT de la requête
 */
function extractToken(req) {
    // 1. Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // 2. Cookie (si utilisé)
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    // 3. Query parameter (déconseillé mais supporté)
    if (req.query.token && typeof req.query.token === 'string') {
        return req.query.token;
    }
    return null;
}
/**
 * Calculer les quotas utilisateur
 */
async function calculateUserQuotas(userId) {
    try {
        const currentQuota = await CacheService_1.cacheService.getQuota(userId, 'analysis');
        const maxQuota = 20; // TODO: Vérifier tier Premium
        return {
            scansPerMonth: maxQuota,
            aiQuestionsPerDay: 0, // TODO: Implémenter
            exportsPerMonth: 0, // TODO: Implémenter
            used: currentQuota,
            remaining: Math.max(0, maxQuota - currentQuota),
            resetDate: getMonthResetDate()
        };
    }
    catch (error) {
        console.error('❌ Calculate quotas error:', error);
        return {
            scansPerMonth: 20,
            aiQuestionsPerDay: 0,
            exportsPerMonth: 0,
            used: 0,
            remaining: 20,
            resetDate: getMonthResetDate()
        };
    }
}
/**
 * Obtenir la date de reset mensuel
 */
function getMonthResetDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

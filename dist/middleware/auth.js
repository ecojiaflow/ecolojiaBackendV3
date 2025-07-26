"use strict";
// PATH: backend/src/middleware/auth.ts
// Adaptateur pour la compatibilité avec payment.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jwt_1 = require("../auth/utils/jwt");
const Logger_1 = require("../utils/Logger");
const log = new Logger_1.Logger('PaymentAuth');
// Version simplifiée de authenticateToken pour payment.routes.ts
const authenticateToken = async (req, res, next) => {
    try {
        // Récupération du token depuis le header Authorization
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Token d\'authentification requis'
            });
            return;
        }
        // Vérification du token
        const decoded = await (0, jwt_1.verifyToken)(token);
        if (!decoded || !decoded.userId) {
            res.status(401).json({
                success: false,
                error: 'Token invalide ou expiré'
            });
            return;
        }
        // Ajout de userId à la requête
        req.userId = decoded.userId;
        log.info(`Utilisateur authentifié pour paiement: ${decoded.email || decoded.userId}`);
        next();
    }
    catch (error) {
        log.error('Erreur authentification paiement:', error);
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                error: 'Token expiré'
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de l\'authentification'
        });
    }
};
exports.authenticateToken = authenticateToken;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../../models/User")); // ✅ import par défaut
const Logger_1 = require("../../utils/Logger");
const logger = new Logger_1.Logger('AuthMiddleware');
/**
 * Middleware d'authentification
 *  • Gère IDs en ObjectId **et** UUID
 *  • Attache req.user { id, email, tier }
 */
async function authenticate(req, res, next) {
    try {
        /* 1. Extraire le token */
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Token manquant' });
        }
        const token = authHeader.split(' ')[1];
        /* 2. Vérifier / décoder */
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        /* 3. Chercher l'utilisateur (ObjectId OU UUID) */
        const query = mongoose_1.default.Types.ObjectId.isValid(decoded.userId)
            ? { _id: decoded.userId }
            : { id: decoded.userId };
        const user = await User_1.default.findOne(query).lean();
        if (!user) {
            return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
        }
        /* 4. Attacher et next */
        req.user = {
            id: user.id || user._id?.toString(),
            email: user.email,
            tier: user.tier || 'free'
        };
        next();
    }
    catch (err) {
        logger.error('[AUTH ERROR]:', err);
        res.status(401).json({ success: false, message: 'Token invalide' });
    }
}
// EOF

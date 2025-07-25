"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
// PATH: backend/src/auth/utils/jwt.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/** Charge la clé et la durée depuis .env */
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
/** Signe un token avec les réglages maison */
function signToken(payload, options) {
    // Fix TypeScript: cast explicite ou utilisation directe
    const finalOptions = options || {};
    // Si pas d'expiresIn dans les options, on l'ajoute
    if (!finalOptions.expiresIn) {
        finalOptions.expiresIn = JWT_EXPIRES_IN; // Cast nécessaire pour TypeScript
    }
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, finalOptions);
}
/** Vérifie et retourne le payload (lève en cas d'échec) */
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
/** Décodage sans vérification – strictement pour debugging */
function decodeToken(token) {
    return jsonwebtoken_1.default.decode(token);
}

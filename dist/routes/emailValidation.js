"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/emailValidation.ts
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const EmailValidationService_1 = require("../auth/services/EmailValidationService"); // ✅ Import corrigé
const router = express_1.default.Router();
// === MIDDLEWARE DE VALIDATION ===
const verifyTokenValidation = [
    (0, express_validator_1.body)('token')
        .isLength({ min: 32, max: 128 })
        .withMessage('Token de validation invalide')
];
const resendEmailValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email invalide')
];
const statusEmailValidation = [
    (0, express_validator_1.param)('email')
        .isEmail()
        .withMessage('Email invalide')
];
// === ROUTES EMAIL VALIDATION ===
/**
 * POST /api/email-validation/verify
 * Vérification token email
 */
router.post('/verify', verifyTokenValidation, async (req, res) => {
    try {
        // Validation des données
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Token invalide',
                errors: errors.array()
            });
        }
        const { token } = req.body;
        console.log('🔍 Vérification token email:', token.substring(0, 8) + '...');
        // Appel service de vérification
        const result = await EmailValidationService_1.emailValidationService.verifyToken(token);
        const statusCode = result.success ? 200 : 400;
        console.log(result.success ? '✅' : '❌', 'Vérification token:', result.message);
        res.status(statusCode).json(result);
    }
    catch (error) {
        console.error('❌ Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la vérification'
        });
    }
});
/**
 * POST /api/email-validation/resend
 * Renvoyer email de validation
 */
router.post('/resend', resendEmailValidation, async (req, res) => {
    try {
        // Validation des données
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Email invalide',
                errors: errors.array()
            });
        }
        const { email } = req.body;
        console.log('📧 Renvoi email validation demandé pour:', email);
        // Appel service de renvoi
        const result = await EmailValidationService_1.emailValidationService.resendVerificationEmail(email);
        const statusCode = result.success ? 200 : 400;
        console.log(result.success ? '✅' : '❌', 'Renvoi email:', result.message);
        res.status(statusCode).json(result);
    }
    catch (error) {
        console.error('❌ Email resend error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du renvoi'
        });
    }
});
/**
 * GET /api/email-validation/status/:email
 * Récupérer statut validation email
 */
router.get('/status/:email', statusEmailValidation, async (req, res) => {
    try {
        // Validation des données
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Email invalide',
                errors: errors.array()
            });
        }
        const { email } = req.params;
        console.log('📊 Vérification statut email:', email);
        // Appel service de statut
        const result = await EmailValidationService_1.emailValidationService.getValidationStatus(email);
        const statusCode = result.success ? 200 : 404;
        res.status(statusCode).json(result);
    }
    catch (error) {
        console.error('❌ Email status error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération du statut'
        });
    }
});
exports.default = router;

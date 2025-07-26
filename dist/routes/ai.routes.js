"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/ai.routes.ts
const express_1 = __importDefault(require("express"));
const auth_1 = require("../auth/middleware/auth");
const AIAnalysisService_1 = require("../services/ai/AIAnalysisService");
const Logger_1 = require("../utils/Logger");
const router = express_1.default.Router();
const log = new Logger_1.Logger('AIRoutes');
// ═══════════════════════════════════════════════════════════════════════
// ANALYSE PRODUIT PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════
router.post('/analyze', auth_1.authenticate, async (req, res) => {
    try {
        const authReq = req;
        const { productName, category, ingredients, barcode, useDeepSeek, customPrompt } = req.body;
        // Validation
        if (!productName || !category) {
            return res.status(400).json({
                success: false,
                message: 'Nom du produit et catégorie requis',
                code: 'MISSING_FIELDS'
            });
        }
        if (!['food', 'cosmetics', 'detergents'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Catégorie invalide. Doit être: food, cosmetics ou detergents',
                code: 'INVALID_CATEGORY'
            });
        }
        log.info(`Analyse demandée: ${productName} (${category}) par ${authReq.user.email}`);
        // Analyse
        const result = await AIAnalysisService_1.aiAnalysisService.analyzeProduct({
            productName,
            category,
            ingredients: ingredients
                ? typeof ingredients === 'string'
                    ? ingredients.split(',').map((i) => i.trim())
                    : ingredients
                : undefined,
            barcode,
            userId: authReq.user.id,
            userTier: authReq.user.tier,
            useDeepSeek: useDeepSeek && authReq.user.tier === 'premium',
            customPrompt
        });
        // Réponse
        res.json({
            success: true,
            data: result,
            user: {
                id: authReq.user.id,
                tier: authReq.user.tier
            }
        });
    }
    catch (error) {
        log.error('Erreur analyse:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'analyse',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// ═══════════════════════════════════════════════════════════════════════
// ANALYSE RAPIDE (sans auth pour demo)
// ═══════════════════════════════════════════════════════════════════════
router.post('/quick-analyze', async (req, res) => {
    try {
        const { productName, category, ingredients } = req.body;
        if (!productName || !category) {
            return res.status(400).json({
                success: false,
                message: 'Nom du produit et catégorie requis'
            });
        }
        log.info(`Analyse rapide: ${productName} (${category})`);
        const result = await AIAnalysisService_1.aiAnalysisService.analyzeProduct({
            productName,
            category,
            ingredients: ingredients
                ? typeof ingredients === 'string'
                    ? ingredients.split(',').map((i) => i.trim())
                    : ingredients
                : undefined,
            userId: 'anonymous',
            userTier: 'free',
            useDeepSeek: false
        });
        res.json({
            success: true,
            data: result,
            mode: 'quick',
            limitations: [
                'Analyse basique sans personnalisation',
                'Pas d\'historique sauvegardé',
                'Pas d\'accès aux features premium'
            ]
        });
    }
    catch (error) {
        log.error('Erreur analyse rapide:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'analyse'
        });
    }
});
// ═══════════════════════════════════════════════════════════════════════
// HISTORIQUE ANALYSES
// ═══════════════════════════════════════════════════════════════════════
router.get('/history', auth_1.authenticate, async (req, res) => {
    try {
        const authReq = req;
        const { limit = 10, offset = 0 } = req.query;
        // TODO: Implémenter récupération depuis DB
        const history = {
            analyses: [],
            total: 0,
            limit: Number(limit),
            offset: Number(offset)
        };
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        log.error('Erreur récupération historique:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'historique'
        });
    }
});
// ═══════════════════════════════════════════════════════════════════════
// DÉTAILS ANALYSE
// ═══════════════════════════════════════════════════════════════════════
router.get('/analysis/:id', auth_1.authenticate, async (req, res) => {
    try {
        const authReq = req;
        const { id } = req.params;
        // TODO: Récupérer depuis cache ou DB
        // Vérifier que l'analyse appartient à l'utilisateur
        res.json({
            success: true,
            data: null,
            message: 'Endpoint en développement'
        });
    }
    catch (error) {
        log.error('Erreur récupération analyse:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'analyse'
        });
    }
});
// ═══════════════════════════════════════════════════════════════════════
// EXPORT PDF
// ═══════════════════════════════════════════════════════════════════════
router.post('/export/:id', auth_1.authenticate, async (req, res) => {
    try {
        const authReq = req;
        const { id } = req.params;
        const { format = 'pdf' } = req.body;
        // TODO: Implémenter génération PDF/CSV
        res.json({
            success: false,
            message: 'Export en cours de développement'
        });
    }
    catch (error) {
        log.error('Erreur export:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'export'
        });
    }
});
exports.default = router;

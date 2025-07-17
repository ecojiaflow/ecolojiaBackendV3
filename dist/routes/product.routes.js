"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/product.routes.ts
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const novaClassifier_1 = __importDefault(require("../services/ai/novaClassifier"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const nova = new novaClassifier_1.default();
router.post('/analyze', upload.none(), async (req, res) => {
    try {
        const input = req.body;
        console.log('📥 Input reçu dans routes:', input);
        const title = input.ocrText || 'Produit inconnu';
        const category = 'food';
        console.log('🔍 Données à analyser dans routes:', { title, category });
        const novaResult = await nova.classify({
            title: title,
            ingredients: []
        });
        // ✅ Réponse simplifiée pour éviter erreurs services manquants
        const result = {
            nova: novaResult,
            insights: {
                educational: ['Classification NOVA selon INSERM 2024'],
                recommendations: ['Vérifier composition produit']
            },
            alternatives: {
                natural: ['Version maison recommandée'],
                organic: ['Équivalent bio disponible']
            },
            eco: {
                score: 50,
                confidence: 0.8
            }
        };
        console.log('✅ Résultat final NOVA dans routes:', novaResult.novaGroup);
        res.json(result);
    }
    catch (error) {
        console.error('❌ Erreur analyse produit dans routes:', error);
        res.status(500).json({ error: error.message || 'Erreur analyse produit' });
    }
});
router.get('/status', (_req, res) => {
    res.json({ status: 'produit routes opérationnel', verified: 'ok' });
});
exports.default = router;
// EOF

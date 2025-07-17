"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProduct = void 0;
const novaClassifier_1 = __importDefault(require("../services/ai/novaClassifier"));
const nova = new novaClassifier_1.default();
const analyzeProduct = async (req, res) => {
    try {
        const input = req.body;
        console.log('📥 Input reçu:', input);
        const title = input.ocrText || 'Produit inconnu';
        const category = 'food';
        console.log('🔍 Données à analyser:', { title, category });
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
        console.log('✅ Résultat final NOVA:', novaResult.novaGroup);
        res.json(result);
    }
    catch (error) {
        console.error('❌ Erreur analyse produit:', error);
        res.status(500).json({ error: error.message || 'Erreur analyse produit' });
    }
};
exports.analyzeProduct = analyzeProduct;
// EOF

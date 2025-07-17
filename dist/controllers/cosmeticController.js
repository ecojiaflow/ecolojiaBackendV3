"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCosmeticController = void 0;
const cosmeticClassifier_1 = require("../services/ai/cosmeticClassifier");
const analyzeCosmeticController = async (req, res) => {
    try {
        const { ingredients, productType = 'general', productName } = req.body;
        // Validation des ingrédients
        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({
                error: 'Liste d\'ingrédients requise',
                code: 'MISSING_INGREDIENTS'
            });
        }
        console.log(`💄 Analyse cosmétique: ${productName || 'Produit sans nom'} (${ingredients.length} ingrédients)`);
        // Analyse selon le type de produit
        let analysis;
        switch (productType) {
            case 'skincare':
                analysis = await cosmeticClassifier_1.CosmeticClassifier.analyzeSkinCare(ingredients);
                break;
            case 'haircare':
                analysis = await cosmeticClassifier_1.CosmeticClassifier.analyzeHairCare(ingredients);
                break;
            default:
                analysis = await cosmeticClassifier_1.CosmeticClassifier.analyzeIngredients(ingredients);
        }
        res.json({
            success: true,
            data: {
                productName: productName || 'Produit cosmétique',
                productType,
                ingredientCount: ingredients.length,
                analysis,
                timestamp: new Date().toISOString(),
                source: 'cosmetic_analysis'
            }
        });
    }
    catch (error) {
        console.error('Erreur analyse cosmétique:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'analyse cosmétique',
            code: 'COSMETIC_ANALYSIS_ERROR'
        });
    }
};
exports.analyzeCosmeticController = analyzeCosmeticController;

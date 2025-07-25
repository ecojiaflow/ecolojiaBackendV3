"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCosmeticController = void 0;
const cosmeticsAnalyzer_1 = require("../services/ai/cosmeticsAnalyzer");
const HealthScoreCalculator_1 = require("../services/ai/HealthScoreCalculator"); // H majuscule
const analyzeCosmeticController = async (req, res) => {
    try {
        const { ingredients, inciList, productType = 'general', productName } = req.body;
        // Parsing flexible des ingrédients
        let ingredientsList = [];
        if (inciList) {
            ingredientsList = inciList
                .split(',')
                .map((i) => i.trim())
                .filter((i) => i.length > 0);
        }
        else if (ingredients) {
            if (typeof ingredients === 'string') {
                ingredientsList = ingredients
                    .split(',')
                    .map((i) => i.trim())
                    .filter((i) => i.length > 0);
            }
            else if (Array.isArray(ingredients)) {
                ingredientsList = ingredients;
            }
        }
        if (ingredientsList.length === 0) {
            return res.status(400).json({
                error: 'Liste d\'ingrédients requise',
                code: 'MISSING_INGREDIENTS',
                help: 'Envoyer ingredients (string ou array) ou inciList (string)'
            });
        }
        console.log(`💄 Analyse cosmétique: ${productName || 'Produit sans nom'} (${ingredientsList.length} ingrédients)`);
        // Utiliser le cosmeticsAnalyzer existant
        const inciAnalysis = await cosmeticsAnalyzer_1.cosmeticsAnalyzer.analyzeINCI(ingredientsList);
        // Adapter pour healthScoreCalculator
        const healthScore = HealthScoreCalculator_1.healthScoreCalculator.calculate({
            category: 'cosmetics',
            productName: productName || 'Produit cosmétique',
            ingredients: ingredientsList,
            cosmeticsAnalysis: {
                hazardScore: inciAnalysis.hazardScore,
                endocrineDisruptors: inciAnalysis.endocrineDisruptors,
                allergens: inciAnalysis.allergens,
                naturalityScore: inciAnalysis.naturalityScore
            }
        });
        res.json({
            success: true,
            data: {
                productName: productName || 'Produit cosmétique',
                productType,
                ingredientCount: ingredientsList.length,
                healthScore: {
                    score: healthScore.score,
                    category: healthScore.category
                },
                analysis: inciAnalysis,
                recommendations: healthScore.recommendations,
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

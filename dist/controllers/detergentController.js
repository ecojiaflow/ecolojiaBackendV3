"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDetergentController = void 0;
const detergentsAnalyzer_1 = require("../services/ai/detergentsAnalyzer");
const HealthScoreCalculator_1 = require("../services/ai/HealthScoreCalculator"); // H majuscule
const analyzeDetergentController = async (req, res) => {
    try {
        const { composition, ingredients, productType = 'general', productName } = req.body;
        // Parsing flexible
        let ingredientsList = [];
        if (composition) {
            ingredientsList = composition
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
        // Validation
        if (ingredientsList.length === 0) {
            return res.status(400).json({
                error: 'Composition du produit requise',
                code: 'MISSING_COMPOSITION',
                help: 'Envoyer composition (string) ou ingredients (string ou array)'
            });
        }
        console.log(`🧽 Analyse détergent: ${productName || 'Produit sans nom'} (${productType})`);
        // Utiliser le detergentsAnalyzer
        const detergentAnalysis = await detergentsAnalyzer_1.detergentsAnalyzer.analyze(ingredientsList);
        // Adapter pour healthScoreCalculator avec la bonne structure
        const healthScore = HealthScoreCalculator_1.healthScoreCalculator.calculate({
            category: 'detergents',
            productName: productName || 'Produit détergent',
            ingredients: ingredientsList,
            detergentsAnalysis: {
                aquaticToxicity: detergentAnalysis.aquaticToxicity,
                biodegradability: detergentAnalysis.biodegradability,
                vocEmissions: detergentAnalysis.vocEmissions
            }
        });
        res.json({
            success: true,
            data: {
                productName: productName || 'Produit détergent',
                productType,
                composition: ingredientsList.join(', '),
                ingredientCount: ingredientsList.length,
                healthScore: {
                    score: healthScore.score,
                    category: healthScore.category
                },
                analysis: detergentAnalysis,
                recommendations: healthScore.recommendations,
                environmentalScore: detergentAnalysis.environmentalScore,
                timestamp: new Date().toISOString(),
                source: 'detergent_analysis'
            }
        });
    }
    catch (error) {
        console.error('Erreur analyse détergent:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'analyse du détergent',
            code: 'DETERGENT_ANALYSIS_ERROR'
        });
    }
};
exports.analyzeDetergentController = analyzeDetergentController;

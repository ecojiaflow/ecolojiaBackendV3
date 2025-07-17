"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDetergentController = void 0;
const detergentClassifier_1 = require("../services/ai/detergentClassifier");
const analyzeDetergentController = async (req, res) => {
    try {
        const { composition, productType = 'general', productName } = req.body;
        // Validation de la composition
        if (!composition || composition.trim().length === 0) {
            return res.status(400).json({
                error: 'Composition du produit requise',
                code: 'MISSING_COMPOSITION'
            });
        }
        console.log(`🧽 Analyse détergent: ${productName || 'Produit sans nom'} (${productType})`);
        // Analyse selon le type de produit
        let analysis;
        switch (productType) {
            case 'laundry':
                analysis = await detergentClassifier_1.DetergentClassifier.analyzeLaundryDetergent(composition);
                break;
            case 'dishwashing':
                analysis = await detergentClassifier_1.DetergentClassifier.analyzeDishwashingLiquid(composition);
                break;
            case 'allpurpose':
                analysis = await detergentClassifier_1.DetergentClassifier.analyzeAllPurposeCleaner(composition);
                break;
            default:
                analysis = await detergentClassifier_1.DetergentClassifier.analyzeComposition(composition);
        }
        res.json({
            success: true,
            data: {
                productName: productName || 'Produit détergent',
                productType,
                composition: composition.substring(0, 200) + (composition.length > 200 ? '...' : ''),
                analysis,
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

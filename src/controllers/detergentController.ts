// PATH: backend/src/controllers/detergentController.ts
import { Request, Response } from 'express';
import { DetergentClassifier } from '../services/ai/detergentClassifier';
import { detergentsAnalyzer } from '../services/ai/detergentsAnalyzer';
import { healthScoreCalculator } from '../services/ai/HealthScoreCalculator'; // H majuscule

interface AnalyzeDetergentRequest {
  composition?: string;
  ingredients?: string[] | string;
  productType?: 'laundry' | 'dishwashing' | 'allpurpose' | 'general';
  productName?: string;
}

export const analyzeDetergentController = async (req: Request, res: Response) => {
  try {
    const { 
      composition, 
      ingredients,
      productType = 'general', 
      productName 
    }: AnalyzeDetergentRequest = req.body;

    // Parsing flexible
    let ingredientsList: string[] = [];
    
    if (composition) {
      ingredientsList = composition
        .split(',')
        .map((i: string) => i.trim())
        .filter((i: string) => i.length > 0);
    } else if (ingredients) {
      if (typeof ingredients === 'string') {
        ingredientsList = ingredients
          .split(',')
          .map((i: string) => i.trim())
          .filter((i: string) => i.length > 0);
      } else if (Array.isArray(ingredients)) {
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
    const detergentAnalysis = await detergentsAnalyzer.analyze(ingredientsList);
    
    // Adapter pour healthScoreCalculator avec la bonne structure
    const healthScore = healthScoreCalculator.calculate({
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

  } catch (error) {
    console.error('Erreur analyse détergent:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'analyse du détergent',
      code: 'DETERGENT_ANALYSIS_ERROR'
    });
  }
};
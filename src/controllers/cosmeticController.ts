// PATH: backend/src/controllers/cosmeticController.ts
import { Request, Response } from 'express';
import { CosmeticClassifier } from '../services/ai/cosmeticClassifier';

interface AnalyzeCosmeticRequest {
  ingredients: string[];
  productType?: 'skincare' | 'haircare' | 'makeup' | 'general';
  productName?: string;
}

export const analyzeCosmeticController = async (req: Request, res: Response) => {
  try {
    const { ingredients, productType = 'general', productName }: AnalyzeCosmeticRequest = req.body;

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
        analysis = await CosmeticClassifier.analyzeSkinCare(ingredients);
        break;
      case 'haircare':
        analysis = await CosmeticClassifier.analyzeHairCare(ingredients);
        break;
      default:
        analysis = await CosmeticClassifier.analyzeIngredients(ingredients);
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

  } catch (error) {
    console.error('Erreur analyse cosmétique:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'analyse cosmétique',
      code: 'COSMETIC_ANALYSIS_ERROR'
    });
  }
};
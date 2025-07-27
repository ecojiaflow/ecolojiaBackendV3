// PATH: backend/src/controllers/cosmeticController.ts
import { Request, Response } from 'express';
import { CosmeticClassifier } from '../services/ai/cosmeticClassifier';
import { cosmeticsAnalyzer } from '../services/ai/cosmeticsAnalyzer';
import { healthScoreCalculator } from '../services/ai/HealthScoreCalculator'; // H majuscule

interface AnalyzeCosmeticRequest {
  ingredients?: string[] | string;
  inciList?: string;
  productType?: 'skincare' | 'haircare' | 'makeup' | 'general';
  productName?: string;
}


export const analyzeCosmeticController = async (req: Request, res: Response) => {
  try {
    // Code existant...
    const { category, name, brand, ingredients } = req.body;
    
    if (!category || !name || !ingredients) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie, nom et ingrédients requis'
      });
    }

    // TODO: Implémenter l'analyse pour cosmeticController
    
    return res.json({
      success: true,
      message: 'Analyse cosmeticController en cours de développement'
    });
    
  } catch (error) {
    console.error('cosmeticController error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

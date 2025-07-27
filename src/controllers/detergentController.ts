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
    // Code existant...
    const { category, name, brand, ingredients } = req.body;
    
    if (!category || !name || !ingredients) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie, nom et ingrédients requis'
      });
    }

    // TODO: Implémenter l'analyse pour detergentController
    
    return res.json({
      success: true,
      message: 'Analyse detergentController en cours de développement'
    });
    
  } catch (error) {
    console.error('detergentController error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

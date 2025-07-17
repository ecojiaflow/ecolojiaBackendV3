// PATH: backend/src/controllers/detergentController.ts
import { Request, Response } from 'express';
import { DetergentClassifier } from '../services/ai/detergentClassifier';

interface AnalyzeDetergentRequest {
  composition: string;
  productType?: 'laundry' | 'dishwashing' | 'allpurpose' | 'general';
  productName?: string;
}

export const analyzeDetergentController = async (req: Request, res: Response) => {
  try {
    const { composition, productType = 'general', productName }: AnalyzeDetergentRequest = req.body;

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
        analysis = await DetergentClassifier.analyzeLaundryDetergent(composition);
        break;
      case 'dishwashing':
        analysis = await DetergentClassifier.analyzeDishwashingLiquid(composition);
        break;
      case 'allpurpose':
        analysis = await DetergentClassifier.analyzeAllPurposeCleaner(composition);
        break;
      default:
        analysis = await DetergentClassifier.analyzeComposition(composition);
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

  } catch (error) {
    console.error('Erreur analyse détergent:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'analyse du détergent',
      code: 'DETERGENT_ANALYSIS_ERROR'
    });
  }
};
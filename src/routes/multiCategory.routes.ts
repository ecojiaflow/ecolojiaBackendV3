// PATH: backend/src/routes/multiCategory.routes.ts
import express, { Request, Response } from 'express';
import { NovaClassifier } from '../services/ai/novaClassifier';

const router = express.Router();
const novaClassifier = new NovaClassifier();

// Exemple temporaire de détection de catégorie
function detectCategory(product: any): string {
  const title = (product?.title || '').toLowerCase();
  if (title.includes('shampoo') || title.includes('gel')) return 'cosmetics';
  if (title.includes('nettoyant') || title.includes('détergent')) return 'detergents';
  return 'food';
}

router.get('/categories', (_req: Request, res: Response) => {
  res.json({
    success: true,
    categories: [
      { id: 'food', name: 'Alimentaire', available: true },
      { id: 'cosmetics', name: 'Cosmétiques', available: false },
      { id: 'detergents', name: 'Détergents', available: false }
    ]
  });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'MultiCategoryRoute',
    available_categories: ['food'],
    timestamp: new Date().toISOString()
  });
});

router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { product } = req.body;

    if (!product || !Array.isArray(product.ingredients)) {
      return res.status(400).json({ success: false, error: 'Produit ou ingrédients manquants' });
    }

    const detectedCategory = detectCategory(product);

    // Analyse NOVA via IA
    const novaAnalysis = novaClassifier.classify(
      product.ingredients,
      product.processing_methods || []
    );

    // Score de base simulé
    const baseScore = 65;
    const finalScore = Math.max(0, baseScore + novaAnalysis.penalties);

    res.json({
      success: true,
      category: detectedCategory,
      analysis: {
        overall_score: finalScore,
        confidence: novaAnalysis.confidence,
        nova_analysis: novaAnalysis
      },
      alternatives: [],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erreur analyse multi-catégories:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne analyse IA',
      message: error.message
    });
  }
});

export default router;
// EOF

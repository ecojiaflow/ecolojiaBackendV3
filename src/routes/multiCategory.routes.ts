// PATH: src/routes/multiCategory.routes.ts

import { Router } from 'express';
import NovaClassifier from '../services/ai/novaClassifier';

const router = Router();
const nova = new NovaClassifier();

router.get('/categories', (_req, res) => {
  res.json({
    success: true,
    categories: [
      { id: 'food', name: 'Alimentaire' },
      { id: 'cosmetics', name: 'Cosmétiques' },
      { id: 'detergents', name: 'Détergents' }
    ],
    message: 'Catégories multi-produits supportées'
  });
});

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'multi-category',
    analyzers: ['NOVAClassifier'],
    timestamp: Date.now()
  });
});

router.post('/analyze', (req, res) => {
  try {
    const product = req.body.product;

    if (!product || !product.ingredients || !Array.isArray(product.ingredients)) {
      return res.status(400).json({ error: 'Produit invalide ou ingrédients manquants' });
    }

    const novaResult = nova.classifyProduct(product);

    res.json({
      success: true,
      category: 'food',
      analysis: {
        nova: novaResult,
        overall_score: 70 + (novaResult.novaGroup === 1 ? 10 : novaResult.novaGroup === 4 ? -20 : 0)
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur analyse NOVA' });
  }
});

export default router;
// EOF

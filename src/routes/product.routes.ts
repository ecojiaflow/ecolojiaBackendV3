// PATH: backend/src/routes/product.routes.ts
import express from 'express';
import multer from 'multer';

import NovaClassifier from '../services/ai/novaClassifier';
import EducationalInsightsEngine from '../services/ai/educationalInsights';
import NaturalAlternativesEngine from '../services/ai/alternativesEngine';
import { calculate } from '../lib/deepseek';

import { ProductAnalysisInput } from '../types/scientific-analysis.types';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const nova = new NovaClassifier();
const insights = new EducationalInsightsEngine();
const alternatives = new NaturalAlternativesEngine();

router.post('/analyze', upload.none(), async (req, res) => {
  try {
    const input = req.body as ProductAnalysisInput;

    const title = input.ocrText || 'Produit inconnu';
    const ingredients = 'sucre, sel, farine';
    const category = 'food';

    const novaResult = await nova.classify({ title, ingredients });

    const insightsResult = await insights.generate({
      productName: title,
      ingredients,
      userGoals: input.userProfile?.healthGoals || []
    });

    const alternativesResult = alternatives.getAlternatives(category);
    const score = await calculate({ title, id: 'temp' });

    res.json({
      nova: novaResult,
      insights: insightsResult,
      alternatives: alternativesResult,
      eco: score
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur analyse produit' });
  }
});

router.get('/status', (_req, res) => {
  res.json({ status: 'produit routes opérationnel', verified: 'ok' });
});

export default router;
// EOF
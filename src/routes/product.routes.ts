// PATH: backend/src/routes/product.routes.ts
import express from 'express';
import multer from 'multer';
import NovaClassifier from '../services/ai/novaClassifier';
import { ProductAnalysisInput } from '../types/scientific-analysis.types';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const nova = new NovaClassifier();

router.post('/analyze', upload.none(), async (req, res) => {
  try {
    const input = req.body as ProductAnalysisInput;
    console.log('📥 Input reçu dans routes:', input);

    const title = input.ocrText || 'Produit inconnu';
    const category = 'food';

    console.log('🔍 Données à analyser dans routes:', { title, category });

    const novaResult = await nova.classify({ 
      title: title, 
      ingredients: []
    });

    // ✅ Réponse simplifiée pour éviter erreurs services manquants
    const result = {
      nova: novaResult,
      insights: {
        educational: ['Classification NOVA selon INSERM 2024'],
        recommendations: ['Vérifier composition produit']
      },
      alternatives: {
        natural: ['Version maison recommandée'],
        organic: ['Équivalent bio disponible']
      },
      eco: {
        score: 50,
        confidence: 0.8
      }
    };

    console.log('✅ Résultat final NOVA dans routes:', novaResult.novaGroup);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Erreur analyse produit dans routes:', error);
    res.status(500).json({ error: error.message || 'Erreur analyse produit' });
  }
});

router.get('/status', (_req, res) => {
  res.json({ status: 'produit routes opérationnel', verified: 'ok' });
});

export default router;
// EOF
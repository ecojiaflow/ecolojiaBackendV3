// 📁 Fichier : src/routes/analyzeDev.routes.js
// 🔧 ROUTE DE TEST - NE BLOQUE PAS SUR confidence < 0.4

const { Router } = require('express');
const FoodScorer = require('../scorers/food/foodScorer');
const foodScorer = new FoodScorer(); // ✅ FIX ICI

const router = Router();

/**
 * POST /analyze/dev
 * Version DEV de l'analyse - toujours retourne le score (même confiance basse)
 */
router.post('/dev', async (req, res) => {
  try {
    const { productData, userProfile = {} } = req.body;

    if (!productData) {
      return res.status(400).json({
        success: false,
        error: 'Données produit manquantes'
      });
    }

    const scoringResult = await foodScorer.analyzeFood(productData, userProfile);

    const response = {
      success: true,
      analysis: {
        score: scoringResult.score,
        grade: scoringResult.grade,
        confidence: scoringResult.confidence,
        confidence_label:
          scoringResult.confidence >= 0.8 ? 'Très fiable' :
          scoringResult.confidence >= 0.6 ? 'Fiable' : 'Faible',
        improvement: scoringResult.improvement,
        breakdown: scoringResult.breakdown,
        nova_classification: scoringResult.breakdown?.transformation?.details?.nova || {},
        additives_analysis: scoringResult.breakdown?.transformation?.details?.additives || {},
        recommendations: scoringResult.recommendations || {},
        alternatives: scoringResult.alternatives || [],
        insights: scoringResult.insights || [],
        chat_context: scoringResult.chat_context || null,
        differentiation: scoringResult.differentiation || {},
        sources: scoringResult.meta?.sources || [],
        meta: scoringResult.meta || {}
      },
      disclaimers: [
        "✅ ROUTE DE TEST - Tous niveaux de confiance acceptés",
        "Information éducative - ne remplace pas avis médical",
        "Basé sur données publiques sous licence ODbL"
      ]
    };

    res.json(response);
  } catch (err) {
    console.error('[analyze.dev] FATAL:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur interne (dev)',
      message: err.message
    });
  }
});

module.exports = router;

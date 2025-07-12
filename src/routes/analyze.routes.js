const { Router } = require('express');
const foodScorer = require('../scorers/food/foodScorer');

const router = Router();

/**
 * POST /analyze/food
 * Analyse complète d'un produit avec IA + Scoring scientifique
 */
router.post('/food', async (req, res) => {
  try {
    const { productData, userProfile = {} } = req.body;

    if (!productData) {
      return res.status(400).json({
        success: false,
        error: 'Données produit manquantes'
      });
    }

    const scoringResult = await foodScorer.analyzeFood(productData, userProfile);

    // Filtrage si la confiance est trop basse pour affichage public
    if (scoringResult.confidence < 0.4) {
      return res.status(422).json({
        success: false,
        error: 'Données insuffisantes pour analyse fiable',
        confidence: scoringResult.confidence,
        message: 'Veuillez fournir plus d\'informations sur le produit'
      });
    }

    const response = {
      success: true,
      analysis: {
        score: scoringResult.score,
        grade: scoringResult.grade,
        confidence: scoringResult.confidence,
        confidence_label:
          foodScorer.confidenceCalculator.getInterpretation
            ? foodScorer.confidenceCalculator.getInterpretation(scoringResult.confidence)
            : scoringResult.confidence >= 0.8
            ? 'Très fiable'
            : scoringResult.confidence >= 0.6
            ? 'Fiable'
            : 'Modérée',
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
        "Information éducative - ne remplace pas avis médical",
        "Basé sur données publiques sous licence ODbL",
        scoringResult.confidence < 0.6 ? "🚨 Donnée estimée - fiabilité modérée" : null
      ].filter(Boolean)
    };

    res.json(response);
  } catch (err) {
    console.error('[analyze.food] FATAL:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur interne analyse',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur'
    });
  }
});

/**
 * GET /analyze/health
 * Vérifie état du service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ECOLOJIA Food Scoring Engine',
    version: '3.0-sprint3-ai',
    features: [
      'NOVA', 'EFSA', 'NutriScore', 'IG',
      'Alternatives IA', 'Insights IA', 'Chat IA'
    ],
    status: 'operational'
  });
});

module.exports = router;

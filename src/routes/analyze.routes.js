const { Router } = require('express');
const foodScorer = require('../scorers/food/foodScorer');
const confidenceCalculator = require('../scorers/common/confidenceCalculator');

const router = Router();

/**
 * POST /analyze/food
 * Analyse scientifique complète d'un produit alimentaire
 */
router.post('/food', async (req, res) => {
  try {
    const { productData } = req.body;

    // Validation entrée
    if (!productData) {
      return res.status(400).json({
        success: false,
        error: 'Données produit manquantes'
      });
    }

    const scoringResult = await foodScorer.analyzeFood(productData);

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
        confidence: scoringResult.confidence,
        confidence_label: scoringResult.confidence >= 0.8 ? 'Très fiable' : 
                         scoringResult.confidence >= 0.6 ? 'Fiable' : 
                         scoringResult.confidence >= 0.4 ? 'Modérément fiable' : 'Peu fiable',

        nova_classification: {
          group: scoringResult.breakdown?.transformation?.details?.nova?.group || 1,
          reasoning: scoringResult.breakdown?.transformation?.details?.nova?.reasoning || ['Classification par défaut'],
          detected_markers: scoringResult.breakdown?.transformation?.details?.nova?.detected_markers || []
        },

        additives_analysis: {
          count: scoringResult.breakdown?.transformation?.details?.additives?.additives_count || 0,
          risk_level: scoringResult.breakdown?.transformation?.details?.additives?.risk_level || 'low',
          risk_factors: scoringResult.breakdown?.transformation?.details?.additives?.risk_factors || [],
          microbiome_impact: scoringResult.breakdown?.transformation?.details?.additives?.microbiome_impact?.global_impact || 'minimal'
        },

        alternatives: scoringResult.alternatives || [],
        insights: scoringResult.insights || [],

        recommendations: {
          alternatives_needed: (scoringResult.alternatives || []).length > 0,
          education_priority: (scoringResult.insights || []).length > 0 ? 'high' : 'medium',
          scientific_recommendations: scoringResult.recommendations || {}
        },

        breakdown: scoringResult.breakdown,

        sources: scoringResult.meta?.sources || [
          'INSERM Classification NOVA 2024',
          'EFSA Additives Database 2024', 
          'ANSES Nutri-Score Algorithm 2024',
          'International Glycemic Index Table 2024'
        ],
        analysis_date: new Date().toISOString(),

        chat_context: scoringResult.chat_context || null,

        differentiation: scoringResult.differentiation || {}
      },

      disclaimers: [
        "Information éducative - ne remplace pas avis médical",
        "Basé sur données publiques sous licence ODbL",
        scoringResult.confidence < 0.6 ? "🚨 Donnée estimée - fiabilité modérée" : null
      ].filter(Boolean)
    };

    res.json(response);

  } catch (error) {
    console.error('[analyze.food] FATAL:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne analyse',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
});

/**
 * GET /analyze/health
 * Check santé service scoring
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ECOLOJIA Food Scoring Service',
    version: '3.0.0-sprint3-ai',
    nova_rules: 'INSERM_2024',
    additives_db: 'EFSA_2024',
    ai_features: {
      'alternatives_engine': 'active',
      'insights_generator': 'active',
      'chat_context': 'active'
    },
    status: 'operational'
  });
});

module.exports = router;

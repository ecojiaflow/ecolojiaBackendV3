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
    
    // Analyse scoring scientifique
    const scoringResult = await foodScorer.calculateFoodScore(productData);
    
    // Vérification seuil confiance légal
    if (scoringResult.confidence < 0.4) {
      return res.status(422).json({
        success: false,
        error: 'Données insuffisantes pour analyse fiable',
        confidence: scoringResult.confidence,
        message: 'Veuillez fournir plus d\'informations sur le produit'
      });
    }
    
    // Réponse enrichie
    const response = {
      success: true,
      analysis: {
        score: scoringResult.score,
        confidence: scoringResult.confidence,
        confidence_label: confidenceCalculator.getInterpretation(scoringResult.confidence),
        nova_classification: {
          group: scoringResult.nova.group,
          reasoning: scoringResult.nova.reasoning,
          detected_markers: scoringResult.nova.detected_markers
        },
        additives_analysis: {
          count: scoringResult.additives.additives_count,
          risk_level: scoringResult.additives.risk_level,
          risk_factors: scoringResult.additives.risk_factors,
          microbiome_impact: scoringResult.additives.microbiome_impact
        },
        recommendations: {
          alternatives_needed: scoringResult.alternatives_suggested,
          education_priority: scoringResult.education_priority
        },
        breakdown: scoringResult.breakdown,
        sources: scoringResult.sources,
        analysis_date: new Date().toISOString()
      },
      disclaimers: [
        "Information éducative - ne remplace pas avis médical",
        "Basé sur données publiques sous licence ODbL",
        scoringResult.confidence < 0.6 ? "🚨 Donnée estimée - fiabilité modérée" : null
      ].filter(Boolean)
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Erreur analyse produit:', error);
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
    version: '1.0.0',
    nova_rules: 'INSERM_2024',
    additives_db: 'EFSA_2024',
    status: 'operational'
  });
});

module.exports = router;
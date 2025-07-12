/**
 * FOOD SCORER HYBRIDE V3.0 – SPRINT 3 IA
 * Correction intégrale : analyseAdditives bien définie
 */

const NovaClassifier = require('./novaClassifier');
const AdditivesAnalyzer = require('./additivesAnalyzer');
const NutriScorer = require('./nutriScorer');
const GlycemicEstimator = require('./glycemicEstimator');
const ConfidenceCalculator = require('../common/confidenceCalculator');

const alternativesEngine = require('../../services/ai/alternativesEngine');
const insightsGenerator = require('../../services/ai/insightsGenerator');

class FoodScorer {
  constructor() {
    this.novaClassifier = new NovaClassifier();
    this.additivesAnalyzer = new AdditivesAnalyzer();
    this.nutriScorer = new NutriScorer();
    this.glycemicEstimator = new GlycemicEstimator();
    this.confidenceCalculator = new ConfidenceCalculator();

    this.baseScore = 80;
    this.weights = {
      transformation: 0.35,
      nutrition: 0.3,
      glycemic: 0.2,
      environmental: 0.15
    };

    console.log('🚀 FoodScorer Hybride V3.0 - Modules IA Sprint 3 activés');
  }

  async analyzeFood(productData, userProfile = {}) {
    try {
      const { name, ingredients, nutrition, certifications = [], packaging = {} } = productData;
      console.log(`🔬 Analyse produit: ${name}`);

      const nova = this.novaClassifier.classify(ingredients);
      const additives = this.additivesAnalyzer.analyze(ingredients);
      const nutriScore = this.nutriScorer.calculateNutriScore(nutrition);
      const glycemic = this.glycemicEstimator.estimateGlycemicIndex({ ingredients, nutrition }, nova);

      const components = {
        transformation: this.calculateTransformationScore(nova, additives),
        nutrition: this.calculateNutritionScore(nutriScore),
        glycemic: this.calculateGlycemicScore(glycemic),
        environmental: this.calculateEnvironmentalScore(certifications, packaging)
      };

      const total = this.calculateTotalScore(components);
      const confidence = this.confidenceCalculator.calculateGlobalConfidence({ nova, additives, nutriScore, glycemic });

      const alternatives = await alternativesEngine.getAlternativesForProduct(productData, userProfile);
      const insights = await insightsGenerator.getInsightsForProduct(productData, userProfile);

      return {
        score: total,
        confidence,
        breakdown: {
          transformation: { score: components.transformation, details: { nova, additives } },
          nutrition: { score: components.nutrition },
          glycemic: { score: components.glycemic },
          environmental: { score: components.environmental }
        },
        nova_classification: nova,
        additives_analysis: additives,
        recommendations: {},
        alternatives,
        insights,
        chat_context: insights.length > 0 ? { available: true } : { error: 'Analyse limitée' },
        differentiation: {},
        sources: [
          'INSERM Classification NOVA 2024',
          'EFSA Additives Database 2024',
          'ANSES Nutri-Score Algorithm 2024',
          'International Glycemic Index Table 2024'
        ],
        meta: {
          version: '3.0-hybride',
          timestamp: new Date().toISOString()
        }
      };
    } catch (err) {
      console.error('❌ Erreur analyseFood:', err);
      return {
        score: 50,
        confidence: 0.3,
        breakdown: {
          transformation: { score: 50, details: { nova: { group: 1 }, additives: { total: 0 } } },
          nutrition: { score: 50 },
          glycemic: { score: 50 },
          environmental: { score: 50 }
        },
        alternatives: [],
        insights: [],
        chat_context: { error: 'Analyse limitée' },
        meta: {
          version: '3.0-fallback',
          error: err.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  calculateTransformationScore(nova, additives) {
    const score = this.baseScore - ((nova.group || 1) * 8) - (additives.total || 0) * 2;
    return Math.max(0, Math.min(100, score));
  }

  calculateNutritionScore(nutriScore) {
    const impact = { A: 15, B: 8, C: 0, D: -5, E: -12 };
    return this.baseScore + (impact[nutriScore.grade] || 0);
  }

  calculateGlycemicScore(glycemic) {
    const index = glycemic.index || 50;
    let penalty = 0;
    if (index > 70) penalty = -10;
    else if (index > 55) penalty = -5;
    return this.baseScore + penalty;
  }

  calculateEnvironmentalScore(certifications, packaging) {
    let score = this.baseScore + certifications.length * 3;
    if (packaging.recyclable === false) score -= 5;
    if (packaging.plastic === true) score -= 3;
    return Math.max(0, Math.min(100, score));
  }

  calculateTotalScore(components) {
    const w = this.weights;
    return Math.round(
      components.transformation * w.transformation +
      components.nutrition * w.nutrition +
      components.glycemic * w.glycemic +
      components.environmental * w.environmental
    );
  }
}

module.exports = FoodScorer;

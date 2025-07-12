// 📁 Fichier : src/scorers/food/foodScorer.js
// ✅ VERSION PRODUCTION - V3.0 RÉVOLUTIONNAIRE (sans fallback)

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

    this.weights = {
      transformation: 0.35,
      nutrition: 0.30,
      glycemic: 0.20,
      environmental: 0.15
    };

    this.baseScore = 80;
    console.log('🚀 FoodScorer V3.0 initialisé - Sprint 3 avec IA Alternatives + Insights');
  }

  async analyzeFood(productData, userProfile = {}) {
    try {
      const startTime = Date.now();

      const {
        name = 'Produit sans nom',
        ingredients = [],
        nutrition = {},
        certifications = [],
        packaging = {}
      } = productData;

      const novaResult = this.novaClassifier.classify(ingredients);
      const additivesResult = this.additivesAnalyzer.analyze(ingredients);
      const nutriScoreResult = this.nutriScorer.calculateNutriScore(nutrition);
      const glycemicResult = this.glycemicEstimator.estimateGlycemicIndex({ ingredients, nutrition }, novaResult);

      const scoringResult = this.calculateScore({
        nova: novaResult,
        additives: additivesResult,
        nutriScore: nutriScoreResult,
        glycemic: glycemicResult,
        certifications,
        packaging
      });

      const alternatives = await alternativesEngine.getAlternativesForProduct(productData, userProfile);
      const insights = await insightsGenerator.getInsightsForProduct(productData, userProfile);

      const confidence = this.confidenceCalculator.calculate({
        nova: novaResult,
        additives: additivesResult,
        nutriScore: nutriScoreResult,
        glycemic: glycemicResult
      });

      const processingTime = Date.now() - startTime;

      return {
        score: Math.round(scoringResult.total),
        confidence,
        grade: this.getScoreGrade(scoringResult.total),
        improvement: this.getImprovementMessage(scoringResult.total),
        breakdown: scoringResult.breakdown,
        alternatives,
        insights,
        chat_context: this.generateChatContext(productData, alternatives, insights, scoringResult),
        recommendations: {},
        differentiation: {},
        meta: {
          version: '3.0-final',
          processing_time_ms: processingTime,
          sources: [
            'INSERM Classification NOVA 2024',
            'EFSA Additives Database 2024',
            'ANSES Nutri-Score Algorithm 2024',
            'International Glycemic Index Table 2024',
            'ECOLOJIA AI Insights & Alternatives'
          ],
          calculated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Erreur dans analyzeFood:', error);
      throw error;
    }
  }

  calculateScore({ nova, additives, nutriScore, glycemic, certifications, packaging }) {
    const breakdown = {
      transformation: this.calculateTransformationScore(nova, additives),
      nutrition: this.calculateNutritionScore(nutriScore),
      glycemic: this.calculateGlycemicScore(glycemic),
      environmental: this.calculateEnvironmentalScore(certifications, packaging)
    };

    const total =
      (breakdown.transformation * this.weights.transformation) +
      (breakdown.nutrition * this.weights.nutrition) +
      (breakdown.glycemic * this.weights.glycemic) +
      (breakdown.environmental * this.weights.environmental);

    return {
      total,
      breakdown: {
        transformation: { score: breakdown.transformation, details: { nova, additives } },
        nutrition: { score: breakdown.nutrition, details: { nutriScore } },
        glycemic: { score: breakdown.glycemic, details: { glycemic } },
        environmental: { score: breakdown.environmental, details: { certifications, packaging } }
      }
    };
  }

  calculateTransformationScore(nova, additives) {
    let score = this.baseScore;
    const novaPenalty = { 1: 0, 2: -8, 3: -20, 4: -35 }[nova.group] || 0;
    score += novaPenalty;
    score -= (additives.microbiomeDisruptors || 0) * 6;
    score -= (additives.controversial || 0) * 4;
    score -= Math.min((additives.total || 0), 12);
    return Math.max(0, score);
  }

  calculateNutritionScore(nutriScore) {
    const impact = { A: 18, B: 10, C: 0, D: -8, E: -18 }[nutriScore.grade] || 0;
    return Math.max(0, Math.min(100, this.baseScore + impact));
  }

  calculateGlycemicScore(glycemic) {
    const ig = glycemic.index || 50;
    const penalty = ig > 70 ? -10 : ig > 55 ? -5 : 0;
    return Math.max(0, this.baseScore + penalty);
  }

  calculateEnvironmentalScore(certifications, packaging) {
    let score = this.baseScore;
    score += Math.min((certifications.length || 0) * 3, 15);
    if (packaging.recyclable === false) score -= 5;
    if (packaging.plastic === true) score -= 3;
    return Math.max(0, Math.min(100, score));
  }

  generateChatContext(productData, alternatives, insights, scoring) {
    return {
      product_analyzed: {
        name: productData.name,
        score: scoring.total,
        grade: this.getScoreGrade(scoring.total)
      },
      available_alternatives: alternatives.length,
      available_insights: insights.length
    };
  }

  getScoreGrade(score) {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  }

  getImprovementMessage(score) {
    if (score >= 85) return 'Excellent produit selon critères scientifiques';
    if (score >= 70) return 'Bon produit avec quelques améliorations possibles';
    if (score >= 55) return 'Produit moyen - Plusieurs améliorations recommandées';
    if (score >= 40) return 'Produit à améliorer - Nombreux critères défavorables';
    return 'Produit déconseillé - Critères scientifiques très défavorables';
  }
}

module.exports = FoodScorer;

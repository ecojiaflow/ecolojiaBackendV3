/**
 * FOOD SCORER HYBRIDE - VERSION SÉCURISÉE AVEC FALLBACKS
 * Utilise modules complets si disponibles, sinon fallback fonctionnel
 * Garantit toujours une réponse + intégration IA Sprint 3
 */

const ConfidenceCalculator = require('../common/confidenceCalculator');

// Import des services IA SPRINT 3 (toujours fonctionnels)
const alternativesEngine = require('../../services/ai/alternativesEngine');
const insightsGenerator = require('../../services/ai/insightsGenerator');

// Imports conditionnels avec fallbacks
let NovaClassifier, AdditivesAnalyzer, NutriScorer, GlycemicEstimator;

try {
  NovaClassifier = require('./novaClassifier');
} catch (error) {
  console.warn('⚠️ NovaClassifier non disponible, utilisation fallback');
  NovaClassifier = null;
}

try {
  AdditivesAnalyzer = require('./additivesAnalyzer');
} catch (error) {
  console.warn('⚠️ AdditivesAnalyzer non disponible, utilisation fallback');
  AdditivesAnalyzer = null;
}

try {
  NutriScorer = require('./nutriScorer');
} catch (error) {
  console.warn('⚠️ NutriScorer non disponible, utilisation fallback');
  NutriScorer = null;
}

try {
  GlycemicEstimator = require('./glycemicEstimator');
} catch (error) {
  console.warn('⚠️ GlycemicEstimator non disponible, utilisation fallback');
  GlycemicEstimator = null;
}

class FoodScorer {
  constructor() {
    this.confidenceCalculator = new ConfidenceCalculator();

    // Initialisation conditionnelle
    this.novaClassifier = NovaClassifier ? new NovaClassifier() : null;
    this.additivesAnalyzer = AdditivesAnalyzer ? new AdditivesAnalyzer() : null;
    this.nutriScorer = NutriScorer ? new NutriScorer() : null;
    this.glycemicEstimator = GlycemicEstimator ? new GlycemicEstimator() : null;

    this.weights = {
      transformation: 0.35,
      nutrition: 0.30,
      glycemic: 0.20,
      environmental: 0.15
    };

    this.baseScore = 80;

    const availableModules = [
      this.novaClassifier ? 'NOVA' : null,
      this.additivesAnalyzer ? 'EFSA' : null,
      this.nutriScorer ? 'Nutri-Score' : null,
      this.glycemicEstimator ? 'IG' : null
    ].filter(Boolean);

    console.log(`🚀 FoodScorer Hybride V3.0 - Modules: [${availableModules.join(', ')}] + IA`);
  }

  /**
   * ANALYSE ALIMENTAIRE HYBRIDE - TOUJOURS FONCTIONNELLE
   */
  async analyzeFood(productData, userProfile = {}) {
    try {
      console.log('🔬 === ANALYSE ALIMENTAIRE HYBRIDE SPRINT 3 ===');
      const startTime = Date.now();

      const {
        name = 'Produit sans nom',
        ingredients = [],
        nutrition = {},
        certifications = [],
        packaging = {}
      } = productData;

      console.log(`📦 Produit: ${name}`);
      console.log(`🧪 Ingrédients: ${ingredients.length} détectés`);

      // ===== ANALYSES SCIENTIFIQUES AVEC FALLBACKS =====

      console.log('🔬 1/6 - Classification NOVA...');
      const novaResult = this.analyzeNOVA(ingredients);

      console.log('🔬 2/6 - Analyse additifs EFSA...');
      const additivesResult = this.analyzeAdditives(ingredients);

      console.log('🔬 3/6 - Calcul Nutri-Score ANSES...');
      const nutriScoreResult = this.analyzeNutriScore(nutrition);

      console.log('🔬 4/6 - Estimation Index Glycémique...');
      const glycemicResult = this.analyzeGlycemic(ingredients, nutrition, novaResult);

      // ===== CALCUL SCORE HYBRIDE =====

      const scoringResult = this.calculateHybridScore({
        nova: novaResult,
        additives: additivesResult,
        nutriScore: nutriScoreResult,
        glycemic: glycemicResult,
        certifications,
        packaging
      });

      // ===== GÉNÉRATION IA (TOUJOURS ACTIVE) =====

      console.log('🤖 5/6 - Génération alternatives IA...');
      const alternatives = await this.generateAlternatives(productData, userProfile, scoringResult);

      console.log('🧠 6/6 - Génération insights éducatifs...');
      const insights = await this.generateInsights(productData, userProfile, scoringResult);

      // ===== RÉSULTAT FINAL =====

      const globalConfidence = this.calculateGlobalConfidence({
        nova: novaResult,
        additives: additivesResult,
        nutriScore: nutriScoreResult,
        glycemic: glycemicResult
      });

      const processingTime = Date.now() - startTime;

      console.log(`🎯 Score: ${Math.round(scoringResult.total)}/100 | Alt: ${alternatives.length} | Insights: ${insights.length} (${processingTime}ms)`);

      return {
        score: Math.round(scoringResult.total),
        confidence: globalConfidence,
        breakdown: scoringResult.components,
        alternatives,
        insights,
        chat_context: this.generateChatContext(productData, alternatives, insights, scoringResult),
        meta: {
          version: '3.0-hybrid-ai',
          processing_time_ms: processingTime,
          modules_used: this.getUsedModules(),
          ai_features: {
            alternatives_generated: alternatives.length,
            insights_generated: insights.length,
            chat_context_available: true
          },
          sources: this.getSources(),
          calculated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Erreur analyse hybride:', error);
      return this.getFallbackResult(productData, error);
    }
  }
}

// ✅ Export correct : instance accessible comme foodScorer.analyzeFood()
const foodScorer = new FoodScorer();
module.exports = foodScorer;

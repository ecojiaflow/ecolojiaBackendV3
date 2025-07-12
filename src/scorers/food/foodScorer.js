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
        // Score principal
        score: Math.round(scoringResult.total),
        confidence: globalConfidence,
        
        // Breakdown détaillé
        breakdown: {
          transformation: {
            score: scoringResult.components.transformation,
            weight: this.weights.transformation,
            details: {
              nova: novaResult,
              additives: additivesResult
            },
            impact: scoringResult.impacts.transformation
          },
          nutrition: {
            score: scoringResult.components.nutrition,
            weight: this.weights.nutrition,
            details: {
              nutriScore: nutriScoreResult
            },
            impact: scoringResult.impacts.nutrition
          },
          glycemic: {
            score: scoringResult.components.glycemic,
            weight: this.weights.glycemic,
            details: {
              glycemicIndex: glycemicResult
            },
            impact: scoringResult.impacts.glycemic
          },
          environmental: {
            score: scoringResult.components.environmental,
            weight: this.weights.environmental,
            details: { certifications, packaging },
            impact: scoringResult.impacts.environmental
          }
        },

        // ===== RÉVOLUTION IA SPRINT 3 =====
        alternatives: alternatives,
        insights: insights,
        chat_context: this.generateChatContext(productData, alternatives, insights, scoringResult),

        // Métadonnées
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

  // ===== ANALYSES AVEC FALLBACKS =====

  analyzeNOVA(ingredients) {
    if (this.novaClassifier) {
      try {
        return this.novaClassifier.classify(ingredients);
      } catch (error) {
        console.warn('⚠️ Erreur NOVA classifier, fallback:', error.message);
      }
    }
    
    // Fallback NOVA simplifié
    return this.fallbackNOVA(ingredients);
  }

  analyzeAdditives(ingredients) {
    if (this.additivesAnalyzer) {
      try {
        return this.additivesAnalyzer.analyze(ingredients);
      } catch (error) {
        console.warn('⚠️ Erreur additives analyzer, fallback:', error.message);
      }
    }
    
    // Fallback additifs simplifié
    return this.fallbackAdditives(ingredients);
  }

  analyzeNutriScore(nutrition) {
    if (this.nutriScorer) {
      try {
        return this.nutriScorer.calculateNutriScore(nutrition);
      } catch (error) {
        console.warn('⚠️ Erreur nutri-score, fallback:', error.message);
      }
    }
    
    // Fallback Nutri-Score simplifié
    return this.fallbackNutriScore(nutrition);
  }

  analyzeGlycemic(ingredients, nutrition, novaResult) {
    if (this.glycemicEstimator) {
      try {
        return this.glycemicEstimator.estimateGlycemicIndex({ ingredients, nutrition }, novaResult);
      } catch (error) {
        console.warn('⚠️ Erreur glycemic estimator, fallback:', error.message);
      }
    }
    
    // Fallback IG simplifié
    return this.fallbackGlycemic(ingredients, nutrition);
  }

  // ===== FALLBACKS SIMPLIFIÉS =====

  fallbackNOVA(ingredients) {
    const ingredientsText = Array.isArray(ingredients) ? ingredients.join(' ').toLowerCase() : String(ingredients).toLowerCase();
    
    let group = 1;
    let reasoning = ['Classification NOVA simplifiée'];
    let detected_markers = [];
    
    // Détection ultra-transformation
    if (ingredientsText.includes('émulsifiant') || ingredientsText.includes('e322') || ingredientsText.includes('e471')) {
      group = 4;
      reasoning = ['Émulsifiants détectés - Ultra-transformé'];
      detected_markers = ['émulsifiants'];
    } else if (ingredients.length > 8) {
      group = 3;
      reasoning = ['Formulation complexe - Transformé'];
      detected_markers = ['formulation_complexe'];
    } else if (ingredients.length > 3) {
      group = 2;
      reasoning = ['Ingrédients multiples - Peu transformé'];
    }
    
    return {
      group,
      confidence: 0.7,
      reasoning,
      detected_markers,
      fallback: true
    };
  }

  fallbackAdditives(ingredients) {
    const ingredientsText = Array.isArray(ingredients) ? ingredients.join(' ').toLowerCase() : String(ingredients).toLowerCase();
    
    let count = 0;
    let risk_level = 'low';
    let risk_factors = [];
    
    // Détection E-codes
    const ecodes = ingredientsText.match(/e\d{3,4}/g) || [];
    count = ecodes.length;
    
    // Détection mots-clés
    if (ingredientsText.includes('émulsifiant')) count++;
    if (ingredientsText.includes('conservateur')) count++;
    if (ingredientsText.includes('colorant')) count++;
    
    if (count >= 3) {
      risk_level = 'high';
      risk_factors = ['Cocktail d\'additifs'];
    } else if (count >= 1) {
      risk_level = 'medium';
      risk_factors = ['Additifs présents'];
    }
    
    return {
      additives_count: count,
      total: count, // Pour compatibilité
      microbiomeDisruptors: count > 0 ? 1 : 0, // Pour compatibilité
      controversial: 0, // Pour compatibilité
      risk_level,
      risk_factors,
      confidence: 0.8,
      fallback: true
    };
  }

  fallbackNutriScore(nutrition) {
    let grade = 'C';
    let score = 0;
    
    // Estimation simplifiée
    if (nutrition.sugars > 22.5) score += 5;
    if (nutrition.saturated_fat > 4) score += 3;
    if (nutrition.salt > 0.9) score += 2;
    
    if (score >= 8) grade = 'E';
    else if (score >= 5) grade = 'D';
    else if (score >= 3) grade = 'C';
    else if (score >= 1) grade = 'B';
    else grade = 'A';
    
    return {
      grade,
      score,
      confidence: 0.6,
      fallback: true,
      impact: {
        bonus: { 'A': 15, 'B': 8, 'C': 0, 'D': -5, 'E': -12 }[grade] || 0,
        description: `Nutri-Score ${grade} estimé`
      }
    };
  }

  fallbackGlycemic(ingredients, nutrition) {
    let index = 50; // Valeur par défaut
    
    const ingredientsText = Array.isArray(ingredients) ? ingredients.join(' ').toLowerCase() : '';
    
    // Estimation basique
    if (ingredientsText.includes('sucre') || nutrition.sugars > 20) {
      index = 70;
    } else if (ingredientsText.includes('céréale') || ingredientsText.includes('farine')) {
      index = 60;
    } else if (ingredientsText.includes('fruit')) {
      index = 40;
    }
    
    return {
      index,
      confidence: 0.5,
      fallback: true,
      impact: {
        penalty: index > 70 ? -10 : index > 55 ? -5 : 0,
        description: `IG estimé ${index}`
      }
    };
  }

  // ===== GÉNÉRATION IA (TOUJOURS ACTIVE) =====

  async generateAlternatives(productData, userProfile, scoring) {
    try {
      const enrichedData = {
        ...productData,
        score: scoring.total,
        breakdown: { transformation: { novaGroup: scoring.nova?.group || 1 } }
      };
      
      return await alternativesEngine.getAlternativesForProduct(enrichedData, userProfile);
    } catch (error) {
      console.error('Erreur alternatives IA:', error);
      return [{
        name: "Alternative naturelle recommandée",
        why_better: "Moins d'additifs et transformation réduite",
        difficulty: "facile",
        confidence: "medium"
      }];
    }
  }

  async generateInsights(productData, userProfile, scoring) {
    try {
      const enrichedData = {
        ...productData,
        score: scoring.total,
        breakdown: { transformation: { novaGroup: scoring.nova?.group || 1 } }
      };
      
      return await insightsGenerator.getInsightsForProduct(enrichedData, userProfile);
    } catch (error) {
      console.error('Erreur insights IA:', error);
      return [{
        type: "general",
        title: "Privilégier les aliments peu transformés",
        fact: "Les aliments moins transformés préservent mieux leurs nutriments",
        confidence: "medium"
      }];
    }
  }

  generateChatContext(productData, alternatives, insights, scoring) {
    return {
      product_analyzed: {
        name: productData.name,
        score: Math.round(scoring.total),
        grade: this.getScoreGrade(scoring.total)
      },
      available_alternatives: alternatives.length,
      available_insights: insights.length,
      quick_actions: [
        { type: 'alternatives', available: alternatives.length > 0 },
        { type: 'insights', available: insights.length > 0 },
        { type: 'ingredients', available: true },
        { type: 'nutrition', available: true }
      ]
    };
  }

  // ===== MÉTHODES CALCUL =====

  calculateHybridScore(analyses) {
    const { nova, additives, nutriScore, glycemic, certifications, packaging } = analyses;

    const components = {
      transformation: this.calculateTransformationScore(nova, additives),
      nutrition: this.calculateNutritionScore(nutriScore),
      glycemic: this.calculateGlycemicScore(glycemic),
      environmental: this.calculateEnvironmentalScore(certifications, packaging)
    };

    const weightedScore = 
      (components.transformation * this.weights.transformation) +
      (components.nutrition * this.weights.nutrition) +
      (components.glycemic * this.weights.glycemic) +
      (components.environmental * this.weights.environmental);

    const impacts = {
      transformation: this.getTransformationImpact(nova, additives),
      nutrition: nutriScore.impact || { bonus: 0, description: 'Nutri-Score estimé' },
      glycemic: glycemic.impact || { penalty: 0, description: 'IG estimé' },
      environmental: this.getEnvironmentalImpact(certifications, packaging)
    };

    return {
      total: Math.max(0, Math.min(100, weightedScore)),
      components,
      impacts,
      nova,
      additives,
      nutriScore,
      glycemic
    };
  }

  calculateTransformationScore(nova, additives) {
    let score = this.baseScore;
    const novaGroup = nova?.group || 1;
    const additivesData = additives || { total: 0, microbiomeDisruptors: 0, controversial: 0 };

    const novaPenalties = { 1: 0, 2: -8, 3: -20, 4: -35 };
    score += novaPenalties[novaGroup] || 0;
    score -= (additivesData.microbiomeDisruptors || 0) * 6;
    score -= (additivesData.controversial || 0) * 4;
    score -= Math.min((additivesData.total || 0) * 1, 12);

    return Math.max(0, score);
  }

  calculateNutritionScore(nutriScore) {
    if (!nutriScore.grade || nutriScore.confidence < 0.4) {
      return this.baseScore;
    }

    const gradeImpacts = { 'A': 18, 'B': 10, 'C': 0, 'D': -8, 'E': -18 };
    const impact = gradeImpacts[nutriScore.grade] || 0;
    return Math.max(0, Math.min(100, this.baseScore + impact));
  }

  calculateGlycemicScore(glycemic) {
    if (!glycemic.index || glycemic.confidence < 0.4) {
      return this.baseScore;
    }

    let penalty = 0;
    if (glycemic.index <= 35) penalty = 0;
    else if (glycemic.index <= 55) penalty = -3;
    else if (glycemic.index <= 69) penalty = -8;
    else if (glycemic.index <= 84) penalty = -15;
    else penalty = -25;

    return Math.max(0, this.baseScore + penalty);
  }

  calculateEnvironmentalScore(certifications, packaging) {
    let score = this.baseScore;
    const certBonus = (certifications || []).length * 3;
    score += Math.min(certBonus, 15);
    if (packaging?.recyclable === false) score -= 5;
    if (packaging?.plastic === true) score -= 3;
    return Math.max(0, Math.min(100, score));
  }

  calculateGlobalConfidence(analyses) {
    const confidences = [
      analyses.nova?.confidence || 0.5,
      analyses.additives?.confidence || 0.5,
      analyses.nutriScore?.confidence || 0.5,
      analyses.glycemic?.confidence || 0.5
    ];
    
    return Math.round(confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length * 100) / 100;
  }

  // ===== MÉTHODES UTILITAIRES =====

  getTransformationImpact(nova, additives) {
    const novaPenalty = { 1: 0, 2: -8, 3: -20, 4: -35 }[nova?.group] || 0;
    const additivesPenalty = -(additives?.total || 0) * 2;
    
    return {
      penalty: novaPenalty + additivesPenalty,
      description: `NOVA ${nova?.group || 'N/A'} + ${additives?.total || 0} additifs`
    };
  }

  getEnvironmentalImpact(certifications, packaging) {
    const bonus = Math.min((certifications || []).length * 3, 15);
    return {
      bonus,
      description: `${(certifications || []).length} certification(s)`
    };
  }

  getScoreGrade(score) {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  }

  getUsedModules() {
    return {
      nova_classifier: !!this.novaClassifier,
      additives_analyzer: !!this.additivesAnalyzer,
      nutri_scorer: !!this.nutriScorer,
      glycemic_estimator: !!this.glycemicEstimator,
      alternatives_engine: true,
      insights_generator: true
    };
  }

  getSources() {
    const sources = ['ECOLOJIA Hybrid Analysis Engine 2024'];
    
    if (this.novaClassifier) sources.push('INSERM Classification NOVA 2024');
    if (this.additivesAnalyzer) sources.push('EFSA Additives Database 2024');
    if (this.nutriScorer) sources.push('ANSES Nutri-Score Algorithm 2024');
    if (this.glycemicEstimator) sources.push('International Glycemic Index Table 2024');
    
    sources.push('ECOLOJIA Natural Alternatives Database 2024');
    sources.push('ECOLOJIA Educational Insights Database 2024');
    
    return sources;
  }

  getFallbackResult(productData, error) {
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
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

module.exports = FoodScorer;
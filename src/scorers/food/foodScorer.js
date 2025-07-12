/**
 * FOOD SCORER ENRICHI - SPRINT 3 RÉVOLUTIONNAIRE
 * Intègre IA alternatives + insights au scoring NOVA + EFSA + Nutri-Score + IG
 * PREMIER SYSTÈME MONDIAL avec alternatives naturelles automatiques
 */

const NovaClassifier = require('./novaClassifier');
const AdditivesAnalyzer = require('./additivesAnalyzer');
const NutriScorer = require('./nutriScorer');
const GlycemicEstimator = require('./glycemicEstimator');
const ConfidenceCalculator = require('../common/confidenceCalculator');

// Import des nouveaux services IA SPRINT 3
const alternativesEngine = require('../../services/ai/alternativesEngine');
const insightsGenerator = require('../../services/ai/insightsGenerator');

class FoodScorer {
  constructor() {
    this.novaClassifier = new NovaClassifier();
    this.additivesAnalyzer = new AdditivesAnalyzer();
    this.nutriScorer = new NutriScorer();
    this.glycemicEstimator = new GlycemicEstimator();
    this.confidenceCalculator = new ConfidenceCalculator();

    // Poids des critères dans le score final (identique Sprint 2)
    this.weights = {
      transformation: 0.35,    // NOVA + Additifs
      nutrition: 0.30,         // Nutri-Score
      glycemic: 0.20,          // Index Glycémique  
      environmental: 0.15      // Packaging + certifications
    };

    this.baseScore = 80;
    
    console.log('🚀 FoodScorer V3.0 initialisé - Sprint 3 avec IA Alternatives + Insights');
  }

  /**
   * ANALYSE COMPLÈTE RÉVOLUTIONNAIRE - VERSION SPRINT 3
   * @param {Object} productData - Données complètes du produit
   * @param {Object} userProfile - Profil utilisateur pour personnalisation IA
   * @returns {Object} Scoring complet + alternatives IA + insights éducatifs
   */
  async analyzeFood(productData, userProfile = {}) {
    try {
      console.log('🔬 === ANALYSE ALIMENTAIRE RÉVOLUTIONNAIRE SPRINT 3 ===');
      const startTime = Date.now();
      
      const {
        name = 'Produit sans nom',
        ingredients = [],
        nutrition = {},
        certifications = [],
        packaging = {},
        barcode = null
      } = productData;

      console.log(`📦 Produit: ${name}`);
      console.log(`🧪 Ingrédients: ${ingredients.length} détectés`);
      console.log(`👤 Profil utilisateur: ${Object.keys(userProfile).length ? 'Personnalisé' : 'Standard'}`);

      // ===== ÉTAPE 1: ANALYSES SCIENTIFIQUES TRADITIONNELLES =====
      
      console.log('🔬 1/6 - Classification NOVA...');
      const novaResult = this.novaClassifier.classify(ingredients);
      
      console.log('🔬 2/6 - Analyse additifs EFSA...');
      const additivesResult = this.additivesAnalyzer.analyze(ingredients);
      
      console.log('🔬 3/6 - Calcul Nutri-Score ANSES...');
      const nutriScoreResult = this.nutriScorer.calculateNutriScore(nutrition);
      
      console.log('🔬 4/6 - Estimation Index Glycémique...');
      const glycemicResult = this.glycemicEstimator.estimateGlycemicIndex(
        { ingredients, nutrition }, 
        novaResult
      );

      // ===== ÉTAPE 2: CALCUL SCORE TRADITIONNEL =====
      
      const traditionalScoring = this.calculateEnhancedScore({
        nova: novaResult,
        additives: additivesResult,
        nutriScore: nutriScoreResult,
        glycemic: glycemicResult,
        certifications,
        packaging
      });

      // ===== ÉTAPE 3 (NOUVEAU): GÉNÉRATION ALTERNATIVES IA =====
      
      console.log('🤖 5/6 - Génération alternatives IA...');
      const alternatives = await this.generateAlternativesWithAI(productData, userProfile, traditionalScoring);
      
      // ===== ÉTAPE 4 (NOUVEAU): GÉNÉRATION INSIGHTS ÉDUCATIFS =====
      
      console.log('🧠 6/6 - Génération insights éducatifs...');
      const insights = await this.generateInsightsWithAI(productData, userProfile, traditionalScoring);

      // ===== ÉTAPE 5 (NOUVEAU): CONTEXTE CHAT IA =====
      
      const chatContext = this.generateChatContext(productData, alternatives, insights, traditionalScoring);

      // ===== ÉTAPE 6: CONFIANCE GLOBALE ENRICHIE =====
      
      const globalConfidence = this.calculateGlobalConfidenceWithAI({
        traditional: this.calculateGlobalConfidence({
          nova: novaResult,
          additives: additivesResult,
          nutriScore: nutriScoreResult,
          glycemic: glycemicResult
        }),
        ai_alternatives: alternatives.length > 0 ? 0.9 : 0.5,
        ai_insights: insights.length > 0 ? 0.9 : 0.5
      });

      // ===== RÉSULTAT FINAL RÉVOLUTIONNAIRE =====
      
      const processingTime = Date.now() - startTime;
      console.log(`🎯 Score: ${Math.round(traditionalScoring.total)}/100 | Alternatives: ${alternatives.length} | Insights: ${insights.length} (${processingTime}ms)`);

      return {
        // Score principal (identique Sprint 2)
        score: Math.round(traditionalScoring.total),
        grade: this.getScoreGrade(traditionalScoring.total),
        confidence: globalConfidence,
        improvement: this.getImprovementMessage(traditionalScoring.total),

        // Breakdown détaillé (identique Sprint 2)
        breakdown: {
          transformation: {
            score: traditionalScoring.components.transformation,
            weight: this.weights.transformation,
            details: {
              nova: novaResult,
              additives: additivesResult
            },
            impact: traditionalScoring.impacts.transformation
          },
          
          nutrition: {
            score: traditionalScoring.components.nutrition,
            weight: this.weights.nutrition,
            details: {
              nutriScore: nutriScoreResult
            },
            impact: traditionalScoring.impacts.nutrition
          },
          
          glycemic: {
            score: traditionalScoring.components.glycemic,
            weight: this.weights.glycemic,
            details: {
              glycemicIndex: glycemicResult
            },
            impact: traditionalScoring.impacts.glycemic
          },
          
          environmental: {
            score: traditionalScoring.components.environmental,
            weight: this.weights.environmental,
            details: {
              certifications,
              packaging
            },
            impact: traditionalScoring.impacts.environmental
          }
        },

        // ===== NOUVEAUTÉS RÉVOLUTIONNAIRES SPRINT 3 =====
        
        // Alternatives naturelles IA (NOUVEAU)
        alternatives: alternatives.slice(0, 4), // Top 4 alternatives
        
        // Insights éducatifs IA (NOUVEAU)
        insights: insights.slice(0, 3), // Top 3 insights
        
        // Contexte chat IA (NOUVEAU)
        chat_context: chatContext,

        // ===== DONNÉES TRADITIONNELLES ENRICHIES =====
        
        // Recommandations scientifiques (enrichies)
        recommendations: this.generateScientificRecommendations({
          score: traditionalScoring.total,
          impacts: traditionalScoring.impacts,
          alternatives: alternatives,
          insights: insights
        }),

        // Comparaison concurrentielle (mise à jour)
        differentiation: {
          vs_yuka: this.compareWithYuka(traditionalScoring, alternatives, insights),
          vs_openfoodfacts: this.compareWithOpenFoodFacts(traditionalScoring, alternatives, insights),
          unique_features: [
            'Classification NOVA avec pénalités',
            'Additifs EFSA avec impact microbiote', 
            'Nutri-Score officiel français',
            'Index glycémique estimé',
            'IA alternatives naturelles automatiques', // NOUVEAU
            'Insights éducatifs personnalisés',        // NOUVEAU
            'Chat IA expert nutrition'                 // NOUVEAU
          ]
        },

        // Métadonnées techniques (enrichies)
        meta: {
          version: '3.0-sprint3-ai',
          criteria_count: 4,
          ai_features: {
            alternatives_generated: alternatives.length,
            insights_generated: insights.length,
            chat_context_available: !!chatContext,
            user_personalized: Object.keys(userProfile).length > 0
          },
          processing_time_ms: processingTime,
          algorithm: 'ECOLOJIA Revolutionary AI-Enhanced Scoring Engine',
          sources: [
            'INSERM Classification NOVA 2024',
            'EFSA Additives Database 2024',
            'ANSES Nutri-Score Algorithm 2024',
            'International Glycemic Index Table 2024',
            'ECOLOJIA Natural Alternatives Database 2024',  // NOUVEAU
            'ECOLOJIA Educational Insights Database 2024'   // NOUVEAU
          ],
          calculated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Erreur analyse alimentaire révolutionnaire:', error);
      
      // Fallback: retourner au moins le scoring traditionnel
      return this.getFallbackScoring(productData, error);
    }
  }

  /**
   * NOUVEAU SPRINT 3: Génération alternatives avec IA
   */
  async generateAlternativesWithAI(productData, userProfile, traditionalScoring) {
    try {
      // Préparer contexte pour l'engine IA
      const aiContext = {
        name: productData.name,
        ingredients: productData.ingredients,
        score: traditionalScoring.total,
        grade: this.getScoreGrade(traditionalScoring.total),
        breakdown: traditionalScoring
      };

      const alternatives = await alternativesEngine.getAlternativesForProduct(aiContext, userProfile);
      
      // Enrichir avec contexte scoring
      return alternatives.map(alt => ({
        ...alt,
        score_improvement: this.calculateScoreImprovement(alt, traditionalScoring),
        relevance_to_issues: this.mapRelevanceToIssues(alt, traditionalScoring),
        user_difficulty: this.assessUserDifficulty(alt, userProfile),
        confidence: alt.sources && alt.sources.length > 0 ? 'high' : 'medium'
      }));

    } catch (error) {
      console.error('Error generating AI alternatives:', error);
      return this.getFallbackAlternatives(productData, traditionalScoring);
    }
  }

  /**
   * NOUVEAU SPRINT 3: Génération insights avec IA
   */
  async generateInsightsWithAI(productData, userProfile, traditionalScoring) {
    try {
      // Préparer contexte pour l'engine IA
      const aiContext = {
        name: productData.name,
        ingredients: productData.ingredients,
        score: traditionalScoring.total,
        breakdown: traditionalScoring
      };

      const insights = await insightsGenerator.getInsightsForProduct(aiContext, userProfile);
      
      // Enrichir avec contexte scoring
      return insights.map(insight => ({
        ...insight,
        score_relevance: this.calculateInsightRelevance(insight, traditionalScoring),
        personalization_level: this.getPersonalizationLevel(insight, userProfile),
        learning_difficulty: this.assessLearningDifficulty(insight, userProfile),
        confidence: insight.source ? 'high' : 'medium'
      }));

    } catch (error) {
      console.error('Error generating AI insights:', error);
      return this.getFallbackInsights(productData, traditionalScoring);
    }
  }

  /**
   * NOUVEAU SPRINT 3: Génération contexte chat IA
   */
  generateChatContext(productData, alternatives, insights, scoring) {
    return {
      product_analyzed: {
        name: productData.name,
        score: Math.round(scoring.total),
        grade: this.getScoreGrade(scoring.total),
        main_issues: this.extractMainIssues(scoring),
        strengths: this.extractStrengths(scoring)
      },
      
      available_alternatives: alternatives.length,
      available_insights: insights.length,
      
      user_can_ask: this.generateSuggestedQuestions(productData, alternatives, insights, scoring),
      
      quick_actions: [
        {
          type: 'alternatives',
          question: 'Quelles sont les alternatives plus saines ?',
          available: alternatives.length > 0
        },
        {
          type: 'insights',
          question: 'Pourquoi ce produit a-t-il ce score ?',
          available: insights.length > 0
        },
        {
          type: 'ingredients',
          question: 'Y a-t-il des ingrédients préoccupants ?',
          available: productData.ingredients.length > 0
        },
        {
          type: 'nutrition',
          question: 'Comment améliorer mon alimentation ?',
          available: true
        }
      ],
      
      context_richness: {
        has_scientific_sources: insights.some(i => i.source),
        has_practical_alternatives: alternatives.some(a => a.difficulty === 'facile'),
        has_personalization: alternatives.some(a => a.user_difficulty) || insights.some(i => i.personalization_level),
        confidence_level: this.calculateContextConfidence(alternatives, insights)
      }
    };
  }

  // ===== MÉTHODES UTILITAIRES NOUVELLES SPRINT 3 =====

  calculateScoreImprovement(alternative, scoring) {
    // Estimation amélioration score si alternative adoptée
    let improvement = 0;
    
    if (alternative.why_better.includes('ultra-transform')) improvement += 15;
    if (alternative.why_better.includes('additif')) improvement += 10;
    if (alternative.why_better.includes('glycémique')) improvement += 8;
    if (alternative.why_better.includes('naturel')) improvement += 5;
    
    return Math.min(improvement, 30); // Max +30 points
  }

  mapRelevanceToIssues(alternative, scoring) {
    const issues = [];
    
    if (scoring.impacts.transformation.penalty < -20) {
      issues.push('ultra_transformation');
    }
    if (scoring.impacts.glycemic.penalty < -10) {
      issues.push('high_glycemic');
    }
    if (scoring.impacts.nutrition.bonus < 0) {
      issues.push('poor_nutrition');
    }
    
    return issues;
  }

  assessUserDifficulty(alternative, userProfile) {
    let baseDifficulty = alternative.difficulty;
    
    // Ajuster selon profil utilisateur
    if (userProfile.cooking_level === 'expert') {
      if (baseDifficulty === 'moyen') return 'facile';
      if (baseDifficulty === 'avancé') return 'moyen';
    }
    
    if (userProfile.time_available === 'limited') {
      if (baseDifficulty === 'facile' && alternative.time && parseInt(alternative.time) > 10) {
        return 'moyen';
      }
    }
    
    return baseDifficulty;
  }

  calculateInsightRelevance(insight, scoring) {
    let relevance = 50; // Score de base
    
    // Bonus selon pertinence avec problèmes détectés
    if (insight.type === 'ultra_transformation' && scoring.impacts.transformation.penalty < -20) {
      relevance += 30;
    }
    if (insight.type === 'glycemia' && scoring.impacts.glycemic.penalty < -10) {
      relevance += 25;
    }
    if (insight.type === 'additives' && scoring.impacts.transformation.penalty < -15) {
      relevance += 25;
    }
    
    return Math.min(relevance, 100);
  }

  getPersonalizationLevel(insight, userProfile) {
    if (Object.keys(userProfile).length === 0) return 'general';
    
    if (insight.personalized) return 'high';
    if (insight.category in (userProfile.health_goals || [])) return 'medium';
    
    return 'low';
  }

  assessLearningDifficulty(insight, userProfile) {
    const userLevel = userProfile.experience_level || 'débutant';
    
    if (userLevel === 'expert') return 'facile';
    if (userLevel === 'intermédiaire') {
      return insight.explanation && insight.explanation.length > 200 ? 'moyen' : 'facile';
    }
    
    // Débutant
    return insight.explanation && insight.explanation.length > 150 ? 'moyen' : 'facile';
  }

  extractMainIssues(scoring) {
    const issues = [];
    
    if (scoring.impacts.transformation.penalty < -20) {
      issues.push('Ultra-transformation');
    }
    if (scoring.impacts.glycemic.penalty < -10) {
      issues.push('Index glycémique élevé');
    }
    if (scoring.impacts.nutrition.bonus < 0) {
      issues.push('Profil nutritionnel défavorable');
    }
    
    return issues;
  }

  extractStrengths(scoring) {
    const strengths = [];
    
    if (scoring.impacts.transformation.penalty >= -5) {
      strengths.push('Peu transformé');
    }
    if (scoring.impacts.nutrition.bonus > 10) {
      strengths.push('Bon profil nutritionnel');
    }
    if (scoring.impacts.environmental.bonus > 5) {
      strengths.push('Certifications environnementales');
    }
    
    return strengths;
  }

  generateSuggestedQuestions(productData, alternatives, insights, scoring) {
    const questions = [];
    
    // Questions basées sur les problèmes détectés
    if (scoring.impacts.transformation.penalty < -20) {
      questions.push("Pourquoi l'ultra-transformation est-elle problématique ?");
    }
    
    if (alternatives.length > 0) {
      questions.push("Comment préparer l'alternative maison ?");
      questions.push("Où acheter ces alternatives plus saines ?");
    }
    
    if (insights.length > 0) {
      questions.push("Comment cette information impact ma santé ?");
    }
    
    // Questions générales
    questions.push("Comment lire correctement une étiquette ?");
    questions.push("Quels produits éviter absolument ?");
    
    return questions.slice(0, 5); // Max 5 suggestions
  }

  calculateContextConfidence(alternatives, insights) {
    let confidence = 0;
    
    // Confiance alternatives
    const altConfidence = alternatives.reduce((sum, alt) => 
      sum + (alt.confidence === 'high' ? 1 : 0.5), 0
    ) / alternatives.length;
    
    // Confiance insights
    const insConfidence = insights.reduce((sum, ins) => 
      sum + (ins.confidence === 'high' ? 1 : 0.5), 0
    ) / insights.length;
    
    confidence = (altConfidence + insConfidence) / 2;
    
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  calculateGlobalConfidenceWithAI(confidences) {
    const { traditional, ai_alternatives, ai_insights } = confidences;
    
    // Pondération: 60% traditionnel, 20% alternatives IA, 20% insights IA
    return (traditional * 0.6) + (ai_alternatives * 0.2) + (ai_insights * 0.2);
  }

  // ===== MÉTHODES FALLBACK =====

  getFallbackAlternatives(productData, scoring) {
    return [{
      name: "Alternative naturelle recommandée",
      why_better: "Moins d'additifs et transformation réduite",
      difficulty: "facile",
      time: "Variable",
      confidence: "medium",
      type: "fallback"
    }];
  }

  getFallbackInsights(productData, scoring) {
    return [{
      type: "general",
      title: "Privilégier les aliments peu transformés",
      fact: "Les aliments moins transformés préservent mieux leurs nutriments",
      explanation: "La transformation industrielle peut altérer la qualité nutritionnelle",
      source: "Principes généraux nutrition",
      confidence: "medium"
    }];
  }

  getFallbackScoring(productData, error) {
    return {
      score: 50,
      grade: 'C',
      confidence: 0.3,
      improvement: 'Analyse limitée en raison d\'une erreur technique',
      alternatives: [],
      insights: [],
      chat_context: { error: 'Services IA temporairement indisponibles' },
      meta: {
        version: '3.0-fallback',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }

  // ===== MÉTHODES EXISTANTES SPRINT 2 (inchangées) =====

  calculateEnhancedScore(analyses) {
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
      nutrition: nutriScore.impact || { bonus: 0, description: 'Nutri-Score non calculé' },
      glycemic: glycemic.impact || { penalty: 0, description: 'IG non estimé' },
      environmental: this.getEnvironmentalImpact(certifications, packaging)
    };

    return {
      total: Math.max(0, Math.min(100, weightedScore)),
      components,
      impacts
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
    const certBonus = certifications.length * 3;
    score += Math.min(certBonus, 15);
    if (packaging.recyclable === false) score -= 5;
    if (packaging.plastic === true) score -= 3;
    return Math.max(0, Math.min(100, score));
  }

  calculateGlobalConfidence(analyses) {
    const { nova, additives, nutriScore, glycemic } = analyses;
    const confidences = [
      { value: nova.confidence || 0.8, weight: 0.25 },
      { value: additives.confidence || 0.9, weight: 0.25 },
      { value: nutriScore.confidence || 0, weight: 0.25 },
      { value: glycemic.confidence || 0, weight: 0.25 }
    ];
    const weightedSum = confidences.reduce((sum, item) => sum + (item.value * item.weight), 0);
    return Math.round(weightedSum * 100) / 100;
  }

  generateScientificRecommendations(data) {
    const recommendations = [];
    
    // Enrichir avec alternatives IA
    if (data.alternatives && data.alternatives.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'ai_alternatives',
        action: `${data.alternatives.length} alternative(s) plus naturelle(s) identifiée(s)`,
        benefit: 'Amélioration significative du profil santé/environnement',
        alternatives: data.alternatives.slice(0, 2).map(alt => alt.name),
        scientific_backing: 'Base de données alternatives ECOLOJIA 2024'
      });
    }

    // Recommandations traditionnelles...
    if (data.impacts.transformation.penalty < -20) {
      recommendations.push({
        priority: 'high',
        category: 'transformation',
        action: 'Privilégier les aliments peu ou non transformés (NOVA 1-2)',
        benefit: 'Réduction des risques cardiovasculaires et inflammatoires',
        alternatives: ['Produits bruts', 'Cuisine maison', 'Aliments fermentés traditionnels'],
        scientific_backing: 'Méta-analyse BMJ 2024 sur 10M+ participants'
      });
    }

    return {
      total: recommendations.length,
      items: recommendations,
      priority_action: recommendations.find(r => r.priority === 'high')?.action || 
                      'Continuer à privilégier les produits moins transformés'
    };
  }

  compareWithYuka(scoring, alternatives, insights) {
    return {
      additional_criteria: 'Nutri-Score + Index Glycémique + IA Alternatives non analysés par Yuka',
      ai_advantage: `${alternatives.length} alternatives naturelles + ${insights.length} insights éducatifs vs scoring basique`,
      scientific_depth: 'Sources officielles ANSES + EFSA + IA personnalisée vs algorithme propriétaire simple'
    };
  }

  compareWithOpenFoodFacts(scoring, alternatives, insights) {
    return {
      vs_off: 'OpenFoodFacts = base données statique sans scoring ni IA',
      ecolojia_plus: `Analyse intelligente + ${alternatives.length} alternatives + ${insights.length} insights + chat IA`,
      ai_revolution: 'Premier assistant IA nutrition vs simple base de données'
    };
  }

  getTransformationImpact(nova, additives) {
    const novaPenalty = { 1: 0, 2: -8, 3: -20, 4: -35 }[nova.group] || 0;
    const additivesPenalty = -(additives.microbiomeDisruptors * 6 + additives.controversial * 4);
    
    return {
      penalty: novaPenalty + additivesPenalty,
      description: `NOVA ${nova.group} + ${additives.total} additifs`,
      details: { nova_impact: novaPenalty, additives_impact: additivesPenalty }
    };
  }

  getEnvironmentalImpact(certifications, packaging) {
    const bonus = Math.min(certifications.length * 3, 15);
    return {
      bonus,
      description: `${certifications.length} certification(s) détectée(s)`,
      certifications_bonus: bonus
    };
  }

  getImprovementMessage(score) {
    if (score >= 85) return 'Excellent produit selon critères scientifiques';
    if (score >= 70) return 'Bon produit avec quelques améliorations possibles';
    if (score >= 55) return 'Produit moyen - Plusieurs améliorations recommandées';
    if (score >= 40) return 'Produit à améliorer - Nombreux critères défavorables';
    return 'Produit déconseillé - Critères scientifiques très défavorables';
  }

  getScoreGrade(score) {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  }
}

module.exports = FoodScorer;
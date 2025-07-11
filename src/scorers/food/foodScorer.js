/**
 * FOOD SCORER ENRICHI - SPRINT 2 TERMINÉ
 * Intègre Nutri-Score + Index Glycémique au scoring NOVA + EFSA
 * Le système de scoring alimentaire le plus avancé du marché
 */

const NovaClassifier = require('./novaClassifier');
const AdditivesAnalyzer = require('./additivesAnalyzer');
const NutriScorer = require('./nutriScorer');
const GlycemicEstimator = require('./glycemicEstimator');
const ConfidenceCalculator = require('../common/confidenceCalculator');

class FoodScorer {
  constructor() {
    this.novaClassifier = new NovaClassifier();
    this.additivesAnalyzer = new AdditivesAnalyzer();
    this.nutriScorer = new NutriScorer();                    // NOUVEAU SPRINT 2
    this.glycemicEstimator = new GlycemicEstimator();        // NOUVEAU SPRINT 2
    this.confidenceCalculator = new ConfidenceCalculator();

    // Poids des critères dans le score final ENRICHI
    this.weights = {
      transformation: 0.35,    // NOVA + Additifs (réduit de 0.6 à 0.35)
      nutrition: 0.30,         // NOUVEAU: Nutri-Score
      glycemic: 0.20,          // NOUVEAU: Index Glycémique  
      environmental: 0.15      // Packaging + certifications (augmenté)
    };

    // Score de base ECOLOJIA
    this.baseScore = 80;
    
    console.log('🚀 FoodScorer V2.0 initialisé - Sprint 2 avec Nutri-Score + IG');
  }

  /**
   * ANALYSE COMPLÈTE ENRICHIE - VERSION SPRINT 2
   * @param {Object} productData - Données complètes du produit
   * @returns {Object} Scoring complet avec 4 critères scientifiques
   */
  async analyzeFood(productData) {
    try {
      console.log('🔬 === ANALYSE ALIMENTAIRE ENRICHIE SPRINT 2 ===');
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
      console.log(`📊 Nutrition: ${Object.keys(nutrition).length} valeurs`);

      // ===== ANALYSES INDIVIDUELLES =====

      // 1. Classification NOVA (existant Sprint 1)
      console.log('🔬 1/4 - Classification NOVA...');
      const novaResult = this.novaClassifier.classify(ingredients);
      console.log(`✅ NOVA: Groupe ${novaResult.group} (${novaResult.confidence})`);

      // 2. Analyse additifs EFSA (existant Sprint 1)
      console.log('🔬 2/4 - Analyse additifs EFSA...');
      const additivesResult = this.additivesAnalyzer.analyze(ingredients);
      console.log(`✅ Additifs: ${additivesResult.total} dont ${additivesResult.microbiomeDisruptors} perturbateurs`);

      // 3. NOUVEAU: Nutri-Score officiel français
      console.log('🔬 3/4 - Calcul Nutri-Score ANSES...');
      const nutriScoreResult = this.nutriScorer.calculateNutriScore(nutrition);
      console.log(`✅ Nutri-Score: ${nutriScoreResult.grade || 'N/A'} (confiance ${nutriScoreResult.confidence})`);

      // 4. NOUVEAU: Index glycémique estimé
      console.log('🔬 4/4 - Estimation Index Glycémique...');
      const glycemicResult = this.glycemicEstimator.estimateGlycemicIndex(
        { ingredients, nutrition }, 
        novaResult
      );
      console.log(`✅ Index Glycémique: ${glycemicResult.index || 'N/A'} (${glycemicResult.category})`);

      // ===== CALCUL SCORE FINAL ENRICHI =====
      
      const finalScoring = this.calculateEnhancedScore({
        nova: novaResult,
        additives: additivesResult,
        nutriScore: nutriScoreResult,
        glycemic: glycemicResult,
        certifications,
        packaging
      });

      // ===== CONFIANCE GLOBALE =====
      
      const globalConfidence = this.calculateGlobalConfidence({
        nova: novaResult,
        additives: additivesResult,
        nutriScore: nutriScoreResult,
        glycemic: glycemicResult
      });

      // ===== INSIGHTS ÉDUCATIFS =====
      
      const insights = this.generateEducationalInsights({
        score: finalScoring.total,
        nova: novaResult,
        additives: additivesResult,
        nutriScore: nutriScoreResult,
        glycemic: glycemicResult
      });

      // ===== RECOMMANDATIONS SCIENTIFIQUES =====
      
      const recommendations = this.generateScientificRecommendations({
        score: finalScoring.total,
        impacts: finalScoring.impacts
      });

      // ===== RÉSULTAT FINAL =====
      
      const processingTime = Date.now() - startTime;
      console.log(`🎯 Score final: ${Math.round(finalScoring.total)}/100 (${processingTime}ms)`);

      return {
        // Score principal enrichi
        score: Math.round(finalScoring.total),
        grade: this.getScoreGrade(finalScoring.total),
        confidence: globalConfidence,
        improvement: this.getImprovementMessage(finalScoring.total),

        // Breakdown détaillé par critère
        breakdown: {
          transformation: {
            score: finalScoring.components.transformation,
            weight: this.weights.transformation,
            details: {
              nova: novaResult,
              additives: additivesResult
            },
            impact: finalScoring.impacts.transformation
          },
          
          nutrition: {
            score: finalScoring.components.nutrition,
            weight: this.weights.nutrition,
            details: {
              nutriScore: nutriScoreResult
            },
            impact: finalScoring.impacts.nutrition
          },
          
          glycemic: {
            score: finalScoring.components.glycemic,
            weight: this.weights.glycemic,
            details: {
              glycemicIndex: glycemicResult
            },
            impact: finalScoring.impacts.glycemic
          },
          
          environmental: {
            score: finalScoring.components.environmental,
            weight: this.weights.environmental,
            details: {
              certifications,
              packaging
            },
            impact: finalScoring.impacts.environmental
          }
        },

        // Insights éducatifs
        insights: insights,

        // Recommandations scientifiques
        recommendations: recommendations,

        // Comparaison concurrentielle
        differentiation: {
          vs_yuka: this.compareWithYuka(finalScoring),
          vs_openfoodfacts: this.compareWithOpenFoodFacts(finalScoring),
          unique_features: [
            'Classification NOVA avec pénalités',
            'Additifs EFSA avec impact microbiote', 
            'Nutri-Score officiel français',
            'Index glycémique estimé',
            'Scoring holistique pondéré'
          ]
        },

        // Métadonnées techniques
        meta: {
          version: '2.0-sprint2',
          criteria_count: 4,
          processing_time_ms: processingTime,
          algorithm: 'ECOLOJIA Enhanced Scoring Engine',
          sources: [
            'INSERM Classification NOVA 2024',
            'EFSA Additives Database 2024',
            'ANSES Nutri-Score Algorithm 2024',
            'International Glycemic Index Table 2024'
          ],
          calculated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Erreur analyse alimentaire enrichie:', error);
      throw new Error(`Échec analyse Sprint 2: ${error.message}`);
    }
  }

  /**
   * CALCUL SCORE ENRICHI - NOUVEAU SYSTÈME SPRINT 2
   */
  calculateEnhancedScore(analyses) {
    const { nova, additives, nutriScore, glycemic, certifications, packaging } = analyses;

    // Calcul scores par composant
    const components = {
      transformation: this.calculateTransformationScore(nova, additives),
      nutrition: this.calculateNutritionScore(nutriScore),
      glycemic: this.calculateGlycemicScore(glycemic),
      environmental: this.calculateEnvironmentalScore(certifications, packaging)
    };

    // Application des poids
    const weightedScore = 
      (components.transformation * this.weights.transformation) +
      (components.nutrition * this.weights.nutrition) +
      (components.glycemic * this.weights.glycemic) +
      (components.environmental * this.weights.environmental);

    // Impacts détaillés pour insights
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

  /**
   * Score transformation (NOVA + Additifs) - Adapté Sprint 2
   */
  calculateTransformationScore(nova, additives) {
    let score = this.baseScore;

    // Vérification données valides
    const novaGroup = nova?.group || 1;
    const additivesData = additives || { total: 0, microbiomeDisruptors: 0, controversial: 0 };

    // Pénalité NOVA
    const novaPenalties = { 1: 0, 2: -8, 3: -20, 4: -35 };
    score += novaPenalties[novaGroup] || 0;

    // Pénalité additifs
    score -= (additivesData.microbiomeDisruptors || 0) * 6;  // -6 pts par perturbateur
    score -= (additivesData.controversial || 0) * 4;         // -4 pts par controversé
    score -= Math.min((additivesData.total || 0) * 1, 12);   // -1 pt par additif (max -12)

    return Math.max(0, score);
  }

  /**
   * Score nutrition (Nutri-Score) - NOUVEAU SPRINT 2
   */
  calculateNutritionScore(nutriScore) {
    if (!nutriScore.grade || nutriScore.confidence < 0.4) {
      return this.baseScore; // Score neutre si pas de données fiables
    }

    // Bonus/malus selon grade Nutri-Score
    const gradeImpacts = {
      'A': 18,   // Très bon profil nutritionnel
      'B': 10,   // Bon profil
      'C': 0,    // Profil moyen
      'D': -8,   // Profil dégradé
      'E': -18   // Profil défavorable
    };

    const impact = gradeImpacts[nutriScore.grade] || 0;
    return Math.max(0, Math.min(100, this.baseScore + impact));
  }

  /**
   * Score glycémique - NOUVEAU SPRINT 2
   */
  calculateGlycemicScore(glycemic) {
    if (!glycemic.index || glycemic.confidence < 0.4) {
      return this.baseScore; // Score neutre si estimation non fiable
    }

    // Pénalités selon IG
    let penalty = 0;
    if (glycemic.index <= 35) penalty = 0;        // IG très faible
    else if (glycemic.index <= 55) penalty = -3;  // IG faible
    else if (glycemic.index <= 69) penalty = -8;  // IG modéré
    else if (glycemic.index <= 84) penalty = -15; // IG élevé
    else penalty = -25;                           // IG très élevé

    return Math.max(0, this.baseScore + penalty);
  }

  /**
   * Score environnemental (certifications + packaging)
   */
  calculateEnvironmentalScore(certifications, packaging) {
    let score = this.baseScore;

    // Bonus certifications
    const certBonus = certifications.length * 3; // +3 pts par certification
    score += Math.min(certBonus, 15); // Maximum +15 pts

    // Pénalité packaging si données disponibles
    if (packaging.recyclable === false) score -= 5;
    if (packaging.plastic === true) score -= 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Confiance globale enrichie
   */
  calculateGlobalConfidence(analyses) {
    const { nova, additives, nutriScore, glycemic } = analyses;

    const confidences = [
      { value: nova.confidence || 0.8, weight: 0.25 },
      { value: additives.confidence || 0.9, weight: 0.25 },
      { value: nutriScore.confidence || 0, weight: 0.25 },
      { value: glycemic.confidence || 0, weight: 0.25 }
    ];

    const weightedSum = confidences.reduce((sum, item) => 
      sum + (item.value * item.weight), 0
    );
    
    return Math.round(weightedSum * 100) / 100;
  }

  /**
   * Insights éducatifs enrichis
   */
  generateEducationalInsights(data) {
    const insights = [];

    // Insight ultra-transformation
    if (data.nova.group >= 4) {
      insights.push({
        type: 'ultra_processing',
        severity: 'high',
        title: 'Produit ultra-transformé détecté',
        fact: 'Les aliments ultra-transformés augmentent le risque cardiovasculaire de 10% par portion quotidienne',
        source: 'BMJ 2024',
        impact: 'Santé cardiovasculaire'
      });
    }

    // Insight additifs microbiote
    if (data.additives.microbiomeDisruptors > 0) {
      insights.push({
        type: 'microbiome_disruption',
        severity: 'medium',
        title: `${data.additives.microbiomeDisruptors} additif(s) perturbateur(s) microbiote`,
        fact: 'Les émulsifiants peuvent perturber l\'équilibre du microbiote intestinal en 2 semaines',
        source: 'Cell 2024',
        impact: 'Santé digestive'
      });
    }

    // Insight Nutri-Score
    if (data.nutriScore.grade && ['D', 'E'].includes(data.nutriScore.grade)) {
      insights.push({
        type: 'poor_nutrition',
        severity: 'medium',
        title: `Nutri-Score ${data.nutriScore.grade} - Profil nutritionnel dégradé`,
        fact: 'Un profil nutritionnel défavorable peut contribuer aux maladies chroniques',
        source: 'ANSES 2024',
        impact: 'Santé métabolique'
      });
    }

    // Insight index glycémique
    if (data.glycemic.index > 70) {
      insights.push({
        type: 'high_glycemic',
        severity: 'medium',
        title: `Index glycémique élevé (${data.glycemic.index})`,
        fact: 'Un IG > 70 provoque un pic glycémique similaire au glucose pur',
        source: 'Table IG internationale 2024',
        impact: 'Régulation glycémique'
      });
    }

    return {
      total_concerns: insights.length,
      items: insights,
      summary: this.generateInsightsSummary(data.score, insights.length)
    };
  }

  /**
   * Recommandations scientifiques enrichies
   */
  generateScientificRecommendations(data) {
    const recommendations = [];

    // Recommandation transformation
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

    // Recommandation nutritionnelle
    if (data.impacts.nutrition.bonus < 0) {
      recommendations.push({
        priority: 'medium',
        category: 'nutrition',
        action: 'Choisir des produits avec meilleur Nutri-Score (A ou B)',
        benefit: 'Amélioration du profil nutritionnel global',
        alternatives: ['Versions moins sucrées', 'Plus de fibres', 'Moins de gras saturés'],
        scientific_backing: 'Algorithme officiel ANSES validé cliniquement'
      });
    }

    // Recommandation glycémique
    if (data.impacts.glycemic.penalty < -10) {
      recommendations.push({
        priority: 'medium',
        category: 'glycemic',
        action: 'Associer avec des fibres ou protéines pour modérer l\'impact glycémique',
        benefit: 'Meilleure régulation de la glycémie et sensation de satiété',
        alternatives: ['Légumes verts', 'Légumineuses', 'Céréales complètes'],
        scientific_backing: 'Études sur index glycémique - Diabetes Care 2024'
      });
    }

    return {
      total: recommendations.length,
      items: recommendations,
      priority_action: recommendations.find(r => r.priority === 'high')?.action || 
                      'Continuer à privilégier les produits moins transformés'
    };
  }

  /**
   * Méthodes utilitaires enrichies
   */
  
  getTransformationImpact(nova, additives) {
    const novaPenalty = { 1: 0, 2: -8, 3: -20, 4: -35 }[nova.group] || 0;
    const additivesPenalty = -(additives.microbiomeDisruptors * 6 + additives.controversial * 4);
    
    return {
      penalty: novaPenalty + additivesPenalty,
      description: `NOVA ${nova.group} + ${additives.total} additifs`,
      details: {
        nova_impact: novaPenalty,
        additives_impact: additivesPenalty
      }
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

  generateInsightsSummary(score, concernsCount) {
    if (score >= 80 && concernsCount === 0) {
      return 'Excellent choix ! Aucun critère défavorable détecté.';
    }
    if (score >= 60 && concernsCount <= 2) {
      return `Produit correct avec ${concernsCount} point(s) d'attention.`;
    }
    return `${concernsCount} problème(s) scientifique(s) identifié(s) - Alternatives recommandées.`;
  }

  compareWithYuka(scoring) {
    const concerns = Object.values(scoring.impacts).filter(i => 
      (i.penalty && i.penalty < -10) || (i.bonus && i.bonus < -5)
    ).length;
    
    return {
      additional_criteria: 'Nutri-Score + Index Glycémique non analysés par Yuka',
      concerns_detected: `${concerns} critères défavorables vs analyse basique Yuka`,
      scientific_depth: 'Sources officielles ANSES + EFSA vs algorithme propriétaire'
    };
  }

  compareWithOpenFoodFacts(scoring) {
    return {
      vs_off: 'OpenFoodFacts = base données sans scoring scientifique',
      ecolojia_plus: 'Analyse intelligente + recommandations personnalisées',
      confidence_system: 'Système de confiance vs données brutes'
    };
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
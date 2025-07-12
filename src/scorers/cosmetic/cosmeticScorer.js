/**
 * ECOLOJIA - Cosmetic Scorer v1.0 SIMPLE
 * Analyse scientifique des produits cosmétiques basée sur la base INCI
 */

const { logger } = require('../../logger');

class CosmeticScorer {
  constructor() {
    // Base de données INCI simplifiée mais fonctionnelle
    this.endocrineDisruptors = {
      'BUTYLPARABEN': { risk: 'high', source: 'ANSM 2024', effect: 'Mimétisme œstrogène' },
      'PROPYLPARABEN': { risk: 'medium', source: 'EFSA 2023', effect: 'Perturbation hormonale' },
      'BENZOPHENONE-3': { risk: 'high', source: 'ANSES 2024', effect: 'Absorption cutanée élevée' },
      'TRICLOSAN': { risk: 'high', source: 'OMS 2023', effect: 'Résistance antibiotique' },
      'BHT': { risk: 'medium', source: 'EFSA 2024', effect: 'Accumulation tissulaire' },
      'BHA': { risk: 'high', source: 'IARC 2024', effect: 'Cancérogène possible' },
      'PHENOXYETHANOL': { risk: 'low', source: 'ANSM 2024', effect: 'Toxique système nerveux >1%' },
      'METHYLISOTHIAZOLINONE': { risk: 'high', source: 'SCCS 2024', effect: 'Allergisant sévère' }
    };

    this.allergens = {
      'LIMONENE': { prevalence: 'high', source: 'REVIDAL 2024' },
      'LINALOOL': { prevalence: 'high', source: 'REVIDAL 2024' },
      'CITRONELLOL': { prevalence: 'medium', source: 'REVIDAL 2024' },
      'GERANIOL': { prevalence: 'medium', source: 'REVIDAL 2024' },
      'BENZYL ALCOHOL': { prevalence: 'medium', source: 'SCCS 2024' },
      'EUGENOL': { prevalence: 'high', source: 'REVIDAL 2024' },
      'COUMARIN': { prevalence: 'medium', source: 'REVIDAL 2024' }
    };

    this.beneficial = {
      'HYALURONIC ACID': { benefit: 'Hydratation', evidence: 'high' },
      'NIACINAMIDE': { benefit: 'Anti-inflammatoire', evidence: 'high' },
      'RETINOL': { benefit: 'Anti-âge', evidence: 'high' },
      'CERAMIDE': { benefit: 'Barrière cutanée', evidence: 'high' },
      'ALOE BARBADENSIS': { benefit: 'Apaisant', evidence: 'medium' },
      'TOCOPHEROL': { benefit: 'Antioxydant', evidence: 'high' },
      'ASCORBIC ACID': { benefit: 'Antioxydant', evidence: 'high' },
      'GLYCERIN': { benefit: 'Humectant', evidence: 'high' }
    };

    this.sensitiveAvoid = [
      'ALCOHOL DENAT', 'PARFUM', 'FRAGRANCE', 
      'SODIUM LAURYL SULFATE', 'SODIUM LAURETH SULFATE'
    ];
  }

  /**
   * Analyse complète d'un produit cosmétique
   */
  async analyzeCosmetic(productData) {
    try {
      logger.info('🧴 Démarrage analyse cosmétique', { 
        product: productData.name || 'Produit inconnu' 
      });
      
      const startTime = Date.now();
      
      // 1. Extraction ingrédients INCI
      const ingredients = this.extractIngredients(productData);
      logger.info('📋 Ingrédients extraits', { count: ingredients.length });
      
      if (ingredients.length === 0) {
        throw new Error('Aucun ingrédient détecté dans les données');
      }
      
      // 2. Analyses spécialisées
      const riskAnalysis = this.analyzeRisks(ingredients);
      const allergenAnalysis = this.analyzeAllergens(ingredients);
      const benefitAnalysis = this.analyzeBenefits(ingredients);
      
      // 3. Calcul breakdown
      const breakdown = this.calculateBreakdown(riskAnalysis, allergenAnalysis, benefitAnalysis, ingredients);
      
      // 4. Score final et confidence
      const finalScore = this.calculateFinalScore(breakdown);
      const confidence = this.calculateConfidence(ingredients, breakdown);
      
      const processingTime = Date.now() - startTime;
      
      logger.info('✅ Analyse cosmétique terminée', { 
        score: finalScore,
        confidence: confidence.value,
        processingTime 
      });

      return {
        score: Math.round(finalScore),
        confidence: confidence.value,
        confidence_label: confidence.label,
        breakdown,
        risk_analysis: riskAnalysis,
        benefit_analysis: benefitAnalysis,
        allergen_analysis: allergenAnalysis,
        meta: {
          ingredients_analyzed: ingredients.length,
          ingredients_recognized: this.countRecognizedIngredients(ingredients),
          processing_time_ms: processingTime,
          sources: ['INCI Database', 'ANSM 2024', 'EFSA 2024', 'SCCS 2024'],
          modules_active: ['risk_assessment', 'benefit_analysis', 'allergen_detection']
        }
      };

    } catch (error) {
      logger.error('❌ Erreur analyse cosmétique', { error: error.message });
      throw new Error(`Erreur analyse cosmétique: ${error.message}`);
    }
  }

  /**
   * Extraction des ingrédients INCI
   */
  extractIngredients(productData) {
    let ingredients = [];
    
    // Sources possibles
    const sources = [
      productData.ingredients,
      productData.composition,
      productData.inci,
      productData.ingredient_list
    ];

    for (const source of sources) {
      if (source && typeof source === 'string') {
        const cleaned = source
          .toUpperCase()
          .replace(/INGREDIENTS?\s*[:;-]?\s*/i, '')
          .replace(/\([^)]*\)/g, '') // Supprime parenthèses
          .replace(/\d+%?/g, '')     // Supprime pourcentages
          .split(/[,;]\s*/)
          .map(ing => ing.trim())
          .filter(ing => ing.length > 2);
        
        ingredients = [...ingredients, ...cleaned];
        break;
      }
    }

    return [...new Set(ingredients)].filter(ing => ing && ing.length > 0);
  }

  /**
   * Analyse des risques
   */
  analyzeRisks(ingredients) {
    const risks = {
      endocrine_disruptors: [],
      toxic_ingredients: [],
      overall_risk: 'low',
      risk_score: 100
    };

    let riskScore = 0;

    for (const ingredient of ingredients) {
      // Perturbateurs endocriniens
      if (this.endocrineDisruptors[ingredient]) {
        const disruptor = this.endocrineDisruptors[ingredient];
        risks.endocrine_disruptors.push({
          name: ingredient,
          risk_level: disruptor.risk,
          effect: disruptor.effect,
          source: disruptor.source
        });
        
        switch (disruptor.risk) {
          case 'high': riskScore += 15; break;
          case 'medium': riskScore += 8; break;
          case 'low': riskScore += 3; break;
        }
      }

      // Ingrédients sensibles
      if (this.sensitiveAvoid.includes(ingredient)) {
        risks.toxic_ingredients.push({
          name: ingredient,
          concern: 'Irritant potentiel peau sensible'
        });
        riskScore += 5;
      }
    }

    // Risque global
    const riskPercentage = (riskScore / ingredients.length) * 100;
    if (riskPercentage > 20) risks.overall_risk = 'high';
    else if (riskPercentage > 10) risks.overall_risk = 'medium';

    risks.risk_score = Math.max(100 - riskScore, 0);
    
    return risks;
  }

  /**
   * Analyse des allergènes
   */
  analyzeAllergens(ingredients) {
    const analysis = {
      detected_allergens: [],
      risk_level: 'low',
      total_allergens: 0,
      allergen_score: 100
    };

    let allergenCount = 0;
    let penalty = 0;

    for (const ingredient of ingredients) {
      if (this.allergens[ingredient]) {
        const allergen = this.allergens[ingredient];
        analysis.detected_allergens.push({
          name: ingredient,
          prevalence: allergen.prevalence,
          source: allergen.source
        });
        
        allergenCount++;
        if (allergen.prevalence === 'high') penalty += 10;
        else if (allergen.prevalence === 'medium') penalty += 6;
        else penalty += 3;
      }
    }

    analysis.total_allergens = allergenCount;
    analysis.allergen_score = Math.max(100 - penalty, 0);
    
    if (allergenCount >= 3) analysis.risk_level = 'high';
    else if (allergenCount >= 2) analysis.risk_level = 'medium';
    
    return analysis;
  }

  /**
   * Analyse des bénéfices
   */
  analyzeBenefits(ingredients) {
    const benefits = {
      active_ingredients: [],
      efficacy_score: 0
    };

    let efficacyScore = 0;

    for (const ingredient of ingredients) {
      if (this.beneficial[ingredient]) {
        const benefit = this.beneficial[ingredient];
        benefits.active_ingredients.push({
          name: ingredient,
          benefit: benefit.benefit,
          evidence_level: benefit.evidence
        });

        switch (benefit.evidence) {
          case 'high': efficacyScore += 10; break;
          case 'medium': efficacyScore += 6; break;
          case 'low': efficacyScore += 3; break;
        }
      }
    }

    benefits.efficacy_score = Math.min(efficacyScore, 100);
    
    return benefits;
  }

  /**
   * Calcul du breakdown détaillé
   */
  calculateBreakdown(riskAnalysis, allergenAnalysis, benefitAnalysis, ingredients) {
    return {
      safety: {
        score: Math.round((riskAnalysis.risk_score + allergenAnalysis.allergen_score) / 2),
        details: {
          endocrine_disruptors: riskAnalysis.endocrine_disruptors.length,
          allergens_detected: allergenAnalysis.total_allergens,
          overall_risk: riskAnalysis.overall_risk
        }
      },
      efficacy: {
        score: benefitAnalysis.efficacy_score,
        details: {
          active_ingredients: benefitAnalysis.active_ingredients.length
        }
      },
      allergens: {
        score: allergenAnalysis.allergen_score,
        details: {
          total_detected: allergenAnalysis.total_allergens,
          risk_level: allergenAnalysis.risk_level
        }
      },
      formulation: {
        score: this.calculateFormulationScore(ingredients),
        details: {
          complexity: this.getComplexity(ingredients.length),
          ingredient_count: ingredients.length
        }
      }
    };
  }

  /**
   * Score final pondéré
   */
  calculateFinalScore(breakdown) {
    const weights = {
      safety: 0.4,
      efficacy: 0.3,
      allergens: 0.2,
      formulation: 0.1
    };

    return Math.round(
      breakdown.safety.score * weights.safety +
      breakdown.efficacy.score * weights.efficacy +
      breakdown.allergens.score * weights.allergens +
      breakdown.formulation.score * weights.formulation
    );
  }

  /**
   * Calcul de la confidence
   */
  calculateConfidence(ingredients, breakdown) {
    let confidence = 0;

    // Reconnaissance ingrédients
    const recognizedRatio = this.countRecognizedIngredients(ingredients) / ingredients.length;
    confidence += recognizedRatio * 0.5;

    // Données d'analyse
    if (breakdown.safety.details.endocrine_disruptors > 0 || breakdown.allergens.details.total_detected > 0) {
      confidence += 0.3;
    }
    if (breakdown.efficacy.details.active_ingredients > 0) {
      confidence += 0.2;
    }

    // Ajustement selon taille
    if (ingredients.length >= 5 && ingredients.length <= 25) {
      confidence = Math.min(confidence + 0.1, 1);
    }

    let label;
    if (confidence >= 0.8) label = "Très fiable";
    else if (confidence >= 0.6) label = "Fiable";
    else if (confidence >= 0.4) label = "Modéré";
    else label = "Faible";

    return {
      value: Math.round(confidence * 100) / 100,
      label
    };
  }

  /**
   * Méthodes utilitaires
   */
  countRecognizedIngredients(ingredients) {
    return ingredients.filter(ingredient => 
      this.endocrineDisruptors[ingredient] ||
      this.allergens[ingredient] ||
      this.beneficial[ingredient] ||
      this.sensitiveAvoid.includes(ingredient)
    ).length;
  }

  calculateFormulationScore(ingredients) {
    let score = 100;
    if (ingredients.length > 25) score -= 15;
    else if (ingredients.length > 20) score -= 10;
    if (ingredients.length <= 10) score += 5;
    return Math.max(score, 0);
  }

  getComplexity(ingredientCount) {
    if (ingredientCount > 25) return 'complex';
    if (ingredientCount > 15) return 'moderate';
    return 'simple';
  }
}

module.exports = CosmeticScorer;
/**
 * ECOLOJIA - Cosmetic Scorer v1.0
 * Analyse scientifique des produits cosmétiques basée sur la base INCI
 * Détection perturbateurs endocriniens, allergènes, toxicité
 */

const logger = require('../utils/logger');

class CosmeticScorer {
  constructor() {
    // Base de données INCI simplifiée (version production nécessiterait base complète)
    this.inciDatabase = {
      // Perturbateurs endocriniens confirmés
      endocrineDisruptors: {
        'BUTYLPARABEN': { risk: 'high', source: 'ANSM 2024', effect: 'Mimétisme œstrogène' },
        'PROPYLPARABEN': { risk: 'medium', source: 'EFSA 2023', effect: 'Perturbation hormonale' },
        'BENZOPHENONE-3': { risk: 'high', source: 'ANSES 2024', effect: 'Absorption cutanée élevée' },
        'TRICLOSAN': { risk: 'high', source: 'OMS 2023', effect: 'Résistance antibiotique' },
        'BHT': { risk: 'medium', source: 'EFSA 2024', effect: 'Accumulation tissulaire' },
        'BHA': { risk: 'high', source: 'IARC 2024', effect: 'Cancérogène possible' },
        'PHENOXYETHANOL': { risk: 'low', source: 'ANSM 2024', effect: 'Toxique système nerveux >1%' },
        'METHYLISOTHIAZOLINONE': { risk: 'high', source: 'SCCS 2024', effect: 'Allergisant sévère' },
        'DMDM HYDANTOIN': { risk: 'medium', source: 'SCCS 2023', effect: 'Libérateur formaldéhyde' }
      },

      // Allergènes les plus fréquents
      allergens: {
        'LIMONENE': { prevalence: 'high', source: 'REVIDAL 2024' },
        'LINALOOL': { prevalence: 'high', source: 'REVIDAL 2024' },
        'CITRONELLOL': { prevalence: 'medium', source: 'REVIDAL 2024' },
        'GERANIOL': { prevalence: 'medium', source: 'REVIDAL 2024' },
        'BENZYL ALCOHOL': { prevalence: 'medium', source: 'SCCS 2024' },
        'BENZYL BENZOATE': { prevalence: 'low', source: 'SCCS 2024' },
        'COUMARIN': { prevalence: 'medium', source: 'REVIDAL 2024' },
        'EUGENOL': { prevalence: 'high', source: 'REVIDAL 2024' },
        'FARNESOL': { prevalence: 'low', source: 'REVIDAL 2024' }
      },

      // Ingrédients bénéfiques
      beneficial: {
        'HYALURONIC ACID': { benefit: 'Hydratation', evidence: 'high' },
        'NIACINAMIDE': { benefit: 'Anti-inflammatoire', evidence: 'high' },
        'RETINOL': { benefit: 'Anti-âge', evidence: 'high' },
        'CERAMIDE': { benefit: 'Barrière cutanée', evidence: 'high' },
        'ALOE BARBADENSIS': { benefit: 'Apaisant', evidence: 'medium' },
        'TOCOPHEROL': { benefit: 'Antioxydant', evidence: 'high' },
        'ASCORBIC ACID': { benefit: 'Antioxydant', evidence: 'high' },
        'PANTHENOL': { benefit: 'Réparateur', evidence: 'medium' },
        'GLYCERIN': { benefit: 'Humectant', evidence: 'high' }
      },

      // Catégories à éviter selon peau sensible
      sensitiveAvoid: [
        'ALCOHOL DENAT', 'PARFUM', 'FRAGRANCE', 'ESSENTIAL OIL',
        'SODIUM LAURYL SULFATE', 'SODIUM LAURETH SULFATE'
      ]
    };

    this.confidenceWeights = {
      ingredientRecognition: 0.4,  // Reconnaissance ingrédients INCI
      riskAssessment: 0.3,         // Évaluation risques
      benefitAnalysis: 0.2,        // Analyse bénéfices
      formulationBalance: 0.1      // Équilibre formulation
    };
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
      
      // Extraction et normalisation ingrédients INCI
      const ingredients = this.extractInciIngredients(productData);
      
      // Analyses spécialisées
      const riskAnalysis = this.analyzeRisks(ingredients);
      const benefitAnalysis = this.analyzeBenefits(ingredients);
      const allergenAnalysis = this.analyzeAllergens(ingredients);
      const formulationAnalysis = this.analyzeFormulation(ingredients);
      
      // Calcul score final
      const breakdown = this.calculateBreakdown(
        riskAnalysis, benefitAnalysis, allergenAnalysis, formulationAnalysis
      );
      
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
        breakdown: {
          safety: breakdown.safety,
          efficacy: breakdown.efficacy,
          allergens: breakdown.allergens,
          formulation: breakdown.formulation
        },
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
   * Extraction et normalisation des ingrédients INCI
   */
  extractInciIngredients(productData) {
    let ingredients = [];
    
    // Sources possibles d'ingrédients
    const sources = [
      productData.ingredients,
      productData.composition,
      productData.inci,
      productData.ingredient_list
    ];

    for (const source of sources) {
      if (source && typeof source === 'string') {
        // Nettoyage et extraction
        const cleaned = source
          .toUpperCase()
          .replace(/INGREDIENTS?\s*[:;-]?\s*/i, '')
          .replace(/\([^)]*\)/g, '') // Supprime parenthèses
          .replace(/\d+%?/g, '')     // Supprime pourcentages
          .split(/[,;]\s*/)
          .map(ing => ing.trim())
          .filter(ing => ing.length > 2);
        
        ingredients = [...ingredients, ...cleaned];
        break; // Utilise la première source valide
      }
    }

    // Dédoublement et nettoyage final
    return [...new Set(ingredients)].filter(ing => ing && ing.length > 0);
  }

  /**
   * Analyse des risques (perturbateurs endocriniens, toxicité)
   */
  analyzeRisks(ingredients) {
    const risks = {
      endocrine_disruptors: [],
      toxic_ingredients: [],
      concentration_warnings: [],
      overall_risk: 'low'
    };

    let riskScore = 0;
    let totalIngredients = ingredients.length;

    for (const ingredient of ingredients) {
      // Vérification perturbateurs endocriniens
      if (this.inciDatabase.endocrineDisruptors[ingredient]) {
        const disruptor = this.inciDatabase.endocrineDisruptors[ingredient];
        risks.endocrine_disruptors.push({
          name: ingredient,
          risk_level: disruptor.risk,
          effect: disruptor.effect,
          source: disruptor.source
        });
        
        // Pénalités selon niveau de risque
        switch (disruptor.risk) {
          case 'high': riskScore += 15; break;
          case 'medium': riskScore += 8; break;
          case 'low': riskScore += 3; break;
        }
      }

      // Vérification ingrédients pour peau sensible
      if (this.inciDatabase.sensitiveAvoid.includes(ingredient)) {
        risks.toxic_ingredients.push({
          name: ingredient,
          concern: 'Irritant potentiel peau sensible',
          recommendation: 'Éviter si peau réactive'
        });
        riskScore += 5;
      }
    }

    // Détermination risque global
    const riskPercentage = (riskScore / totalIngredients) * 100;
    if (riskPercentage > 20) risks.overall_risk = 'high';
    else if (riskPercentage > 10) risks.overall_risk = 'medium';
    else risks.overall_risk = 'low';

    risks.risk_score = Math.min(100 - riskScore, 100);
    
    return risks;
  }

  /**
   * Analyse des bénéfices (ingrédients actifs)
   */
  analyzeBenefits(ingredients) {
    const benefits = {
      active_ingredients: [],
      skincare_benefits: [],
      efficacy_score: 0
    };

    let benefitScore = 0;

    for (const ingredient of ingredients) {
      if (this.inciDatabase.beneficial[ingredient]) {
        const benefit = this.inciDatabase.beneficial[ingredient];
        benefits.active_ingredients.push({
          name: ingredient,
          benefit: benefit.benefit,
          evidence_level: benefit.evidence
        });

        // Bonus selon niveau de preuve
        switch (benefit.evidence) {
          case 'high': benefitScore += 10; break;
          case 'medium': benefitScore += 6; break;
          case 'low': benefitScore += 3; break;
        }
      }
    }

    // Regroupement par catégorie de bénéfices
    const benefitCategories = {
      'Hydratation': ['HYALURONIC ACID', 'GLYCERIN', 'CERAMIDE'],
      'Anti-âge': ['RETINOL', 'NIACINAMIDE', 'ASCORBIC ACID'],
      'Apaisant': ['ALOE BARBADENSIS', 'PANTHENOL'],
      'Protection': ['TOCOPHEROL']
    };

    for (const [category, categoryIngredients] of Object.entries(benefitCategories)) {
      const foundIngredients = ingredients.filter(ing => 
        categoryIngredients.includes(ing)
      );
      
      if (foundIngredients.length > 0) {
        benefits.skincare_benefits.push({
          category,
          ingredients: foundIngredients,
          count: foundIngredients.length
        });
      }
    }

    benefits.efficacy_score = Math.min(benefitScore, 100);
    
    return benefits;
  }

  /**
   * Analyse des allergènes
   */
  analyzeAllergens(ingredients) {
    const allergens = {
      detected_allergens: [],
      risk_level: 'low',
      sensitive_skin_warning: false
    };

    let allergenCount = 0;
    let highRiskAllergens = 0;

    for (const ingredient of ingredients) {
      if (this.inciDatabase.allergens[ingredient]) {
        const allergen = this.inciDatabase.allergens[ingredient];
        allergens.detected_allergens.push({
          name: ingredient,
          prevalence: allergen.prevalence,
          source: allergen.source
        });
        
        allergenCount++;
        if (allergen.prevalence === 'high') {
          highRiskAllergens++;
        }
      }
    }

    // Détermination niveau de risque allergène
    if (highRiskAllergens >= 2 || allergenCount >= 4) {
      allergens.risk_level = 'high';
      allergens.sensitive_skin_warning = true;
    } else if (allergenCount >= 2) {
      allergens.risk_level = 'medium';
    }

    allergens.total_allergens = allergenCount;
    allergens.allergen_score = Math.max(100 - (allergenCount * 8), 0);
    
    return allergens;
  }

  /**
   * Analyse de la formulation générale
   */
  analyzeFormulation(ingredients) {
    const formulation = {
      ingredient_count: ingredients.length,
      complexity: 'simple',
      natural_ratio: 0,
      synthetic_ratio: 0,
      formulation_score: 0
    };

    // Analyse complexité formulation
    if (ingredients.length > 30) formulation.complexity = 'complex';
    else if (ingredients.length > 15) formulation.complexity = 'moderate';
    else formulation.complexity = 'simple';

    // Estimation ratio naturel/synthétique (simplifiée)
    const naturalKeywords = ['EXTRACT', 'OIL', 'BUTTER', 'WAX', 'ALOE', 'ROSA'];
    const syntheticKeywords = ['SODIUM', 'POLYMER', 'SILICONE', 'PARABEN', 'SULFATE'];
    
    let naturalCount = 0;
    let syntheticCount = 0;

    for (const ingredient of ingredients) {
      if (naturalKeywords.some(keyword => ingredient.includes(keyword))) {
        naturalCount++;
      }
      if (syntheticKeywords.some(keyword => ingredient.includes(keyword))) {
        syntheticCount++;
      }
    }

    formulation.natural_ratio = naturalCount / ingredients.length;
    formulation.synthetic_ratio = syntheticCount / ingredients.length;

    // Score formulation (favorise simplicité et ingrédients naturels)
    let formulationScore = 100;
    
    // Pénalité complexité excessive
    if (ingredients.length > 25) formulationScore -= 15;
    else if (ingredients.length > 20) formulationScore -= 10;
    
    // Bonus ingrédients naturels
    formulationScore += (formulation.natural_ratio * 20);
    
    formulation.formulation_score = Math.min(formulationScore, 100);
    
    return formulation;
  }

  /**
   * Calcul du breakdown détaillé
   */
  calculateBreakdown(riskAnalysis, benefitAnalysis, allergenAnalysis, formulationAnalysis) {
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
          active_ingredients: benefitAnalysis.active_ingredients.length,
          benefit_categories: benefitAnalysis.skincare_benefits.length
        }
      },
      allergens: {
        score: allergenAnalysis.allergen_score,
        details: {
          total_detected: allergenAnalysis.total_allergens,
          risk_level: allergenAnalysis.risk_level,
          sensitive_warning: allergenAnalysis.sensitive_skin_warning
        }
      },
      formulation: {
        score: formulationAnalysis.formulation_score,
        details: {
          complexity: formulationAnalysis.complexity,
          ingredient_count: formulationAnalysis.ingredient_count,
          natural_ratio: Math.round(formulationAnalysis.natural_ratio * 100)
        }
      }
    };
  }

  /**
   * Calcul du score final pondéré
   */
  calculateFinalScore(breakdown) {
    const weights = {
      safety: 0.4,      // Sécurité prioritaire
      efficacy: 0.3,    // Efficacité importante
      allergens: 0.2,   // Allergènes critiques
      formulation: 0.1  // Formulation bonus
    };

    return Math.round(
      breakdown.safety.score * weights.safety +
      breakdown.efficacy.score * weights.efficacy +
      breakdown.allergens.score * weights.allergens +
      breakdown.formulation.score * weights.formulation
    );
  }

  /**
   * Calcul de la confidence d'analyse
   */
  calculateConfidence(ingredients, breakdown) {
    let confidence = 0;

    // Base : reconnaissance ingrédients
    const recognizedRatio = this.countRecognizedIngredients(ingredients) / ingredients.length;
    confidence += recognizedRatio * this.confidenceWeights.ingredientRecognition;

    // Qualité évaluation risques (présence d'ingrédients connus)
    const knownRiskyIngredients = ingredients.filter(ing => 
      this.inciDatabase.endocrineDisruptors[ing] || 
      this.inciDatabase.allergens[ing]
    ).length;
    
    const riskConfidence = Math.min(knownRiskyIngredients / 5, 1);
    confidence += riskConfidence * this.confidenceWeights.riskAssessment;

    // Qualité analyse bénéfices
    const knownBeneficialIngredients = ingredients.filter(ing => 
      this.inciDatabase.beneficial[ing]
    ).length;
    
    const benefitConfidence = Math.min(knownBeneficialIngredients / 3, 1);
    confidence += benefitConfidence * this.confidenceWeights.benefitAnalysis;

    // Équilibre formulation (taille raisonnable)
    const formulationConfidence = ingredients.length >= 5 && ingredients.length <= 25 ? 1 : 0.5;
    confidence += formulationConfidence * this.confidenceWeights.formulationBalance;

    // Conversion en labels
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
   * Compte les ingrédients reconnus dans la base
   */
  countRecognizedIngredients(ingredients) {
    return ingredients.filter(ingredient => 
      this.inciDatabase.endocrineDisruptors[ingredient] ||
      this.inciDatabase.allergens[ingredient] ||
      this.inciDatabase.beneficial[ingredient] ||
      this.inciDatabase.sensitiveAvoid.includes(ingredient)
    ).length;
  }

  /**
   * Génération d'alternatives cosmétiques
   */
  async generateAlternatives(productData, analysisResult) {
    const alternatives = [];
    
    // Catégorisation du produit
    const productType = this.detectProductType(productData);
    
    // Alternatives basées sur les problèmes détectés
    if (analysisResult.risk_analysis.endocrine_disruptors.length > 0) {
      alternatives.push({
        type: 'Marque clean beauty',
        reason: 'Sans perturbateurs endocriniens',
        examples: ['Weleda', 'Dr. Hauschka', 'Melvita'],
        benefit: 'Réduction risque hormonal'
      });
    }

    if (analysisResult.allergen_analysis.total_allergens > 2) {
      alternatives.push({
        type: 'Formule hypoallergénique',
        reason: 'Moins d\'allergènes détectés',
        examples: ['Avène', 'La Roche-Posay', 'Eucerin'],
        benefit: 'Meilleure tolérance cutanée'
      });
    }

    if (analysisResult.breakdown.formulation.details.natural_ratio < 0.3) {
      alternatives.push({
        type: 'Cosmétiques bio/naturels',
        reason: 'Plus d\'ingrédients naturels',
        examples: ['Cattier', 'Logona', 'Lavera'],
        benefit: 'Formulation plus respectueuse'
      });
    }

    // Alternative DIY si pertinent
    if (productType === 'soin' || productType === 'nettoyant') {
      alternatives.push({
        type: 'Recette maison',
        reason: 'Contrôle total des ingrédients',
        examples: ['Huile de jojoba + aloe vera', 'Savon de Marseille pur'],
        benefit: 'Économique et personnalisable'
      });
    }

    return alternatives;
  }

  /**
   * Détection du type de produit cosmétique
   */
  detectProductType(productData) {
    const name = (productData.name || '').toLowerCase();
    const category = (productData.category || '').toLowerCase();
    
    if (name.includes('crème') || name.includes('lait') || category.includes('soin')) {
      return 'soin';
    } else if (name.includes('shampoo') || name.includes('gel') || category.includes('nettoyant')) {
      return 'nettoyant';
    } else if (name.includes('maquillage') || category.includes('makeup')) {
      return 'maquillage';
    } else {
      return 'autre';
    }
  }
}

module.exports = CosmeticScorer;
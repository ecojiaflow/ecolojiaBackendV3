/**
 * NUTRI-SCORE OFFICIEL FRANÇAIS
 * Calculateur basé sur l'algorithme ANSES 2024
 * Sources: Arrêté du 31 octobre 2017 + mises à jour ANSES
 */

const nutriScoreTables = require('../../data/nutri-score-tables.json');

class NutriScorer {
  constructor() {
    this.tables = nutriScoreTables;
    this.minConfidence = this.tables.confidence_factors.minimum_confidence;
    console.log('🥗 NutriScorer initialisé avec tables ANSES 2024');
  }

  /**
   * Calcule le Nutri-Score d'un produit
   * @param {Object} nutritionData - Données nutritionnelles pour 100g
   * @param {Object} options - Options de calcul
   * @returns {Object} Résultat Nutri-Score complet
   */
  calculateNutriScore(nutritionData, options = {}) {
    try {
      console.log('🔬 Calcul Nutri-Score démarré');
      
      // Validation et enrichissement des données
      const enrichedData = this.enrichNutritionData(nutritionData);
      const confidence = this.calculateConfidence(enrichedData);
      
      // Vérification seuil de confiance
      if (confidence < this.minConfidence) {
        return {
          score: null,
          grade: null,
          confidence: confidence,
          status: 'insufficient_data',
          message: 'Données nutritionnelles insuffisantes pour calcul fiable',
          required: this.getRequiredData(),
          source: this.tables.meta.legal_disclaimer
        };
      }

      // Calcul des points négatifs
      const negativePoints = this.calculateNegativePoints(enrichedData);
      
      // Calcul des points positifs
      const positivePoints = this.calculatePositivePoints(enrichedData);
      
      // Score final
      const finalScore = negativePoints.total - positivePoints.total;
      
      // Détermination du grade
      const grade = this.determineGrade(finalScore, options.isBeverage);
      
      // Impact sur score global ECOLOJIA
      const scoringImpact = this.calculateScoringImpact(grade, finalScore);

      const result = {
        score: finalScore,
        grade: grade.letter,
        confidence: confidence,
        status: 'calculated',
        
        // Détails des points
        breakdown: {
          negative: {
            total: negativePoints.total,
            energy: negativePoints.energy,
            saturatedFat: negativePoints.saturatedFat,
            sugars: negativePoints.sugars,
            sodium: negativePoints.sodium
          },
          positive: {
            total: positivePoints.total,
            fruitsVegetables: positivePoints.fruitsVegetables,
            fiber: positivePoints.fiber,
            proteins: positivePoints.proteins
          }
        },
        
        // Impact sur scoring ECOLOJIA
        impact: scoringImpact,
        
        // Métadonnées
        meta: {
          algorithm: 'Nutri-Score officiel français',
          source: this.tables.meta.source,
          version: this.tables.meta.version,
          calculated_at: new Date().toISOString(),
          legal_disclaimer: this.tables.meta.legal_disclaimer
        }
      };

      console.log(`✅ Nutri-Score calculé: ${grade.letter} (${finalScore} points)`);
      return result;

    } catch (error) {
      console.error('❌ Erreur calcul Nutri-Score:', error);
      return {
        score: null,
        grade: null,
        confidence: 0,
        status: 'error',
        error: error.message,
        source: this.tables.meta.legal_disclaimer
      };
    }
  }

  /**
   * Enrichit et valide les données nutritionnelles
   */
  enrichNutritionData(data) {
    const enriched = { ...data };
    
    // Conversion énergie kcal → kJ si nécessaire
    if (enriched.energy_kcal && !enriched.energy_kj) {
      enriched.energy_kj = enriched.energy_kcal * 4.184;
    }
    
    // Conversion sel → sodium si nécessaire
    if (enriched.salt && !enriched.sodium) {
      enriched.sodium = enriched.salt / 2.5;
    }
    
    // Valeurs par défaut pour calculs
    enriched.energy_kj = enriched.energy_kj || 0;
    enriched.saturated_fat = enriched.saturated_fat || 0;
    enriched.sugars = enriched.sugars || 0;
    enriched.sodium = enriched.sodium || 0;
    enriched.fiber = enriched.fiber || 0;
    enriched.proteins = enriched.proteins || 0;
    enriched.fruits_vegetables = enriched.fruits_vegetables || 0;
    
    return enriched;
  }

  /**
   * Calcule les points négatifs
   */
  calculateNegativePoints(data) {
    const points = {
      energy: this.getPointsFromTable(data.energy_kj, 'energy'),
      saturatedFat: this.getPointsFromTable(data.saturated_fat, 'saturated_fat'),
      sugars: this.getPointsFromTable(data.sugars, 'sugars'),
      sodium: this.getPointsFromTable(data.sodium, 'sodium')
    };
    
    points.total = points.energy + points.saturatedFat + points.sugars + points.sodium;
    
    console.log('📊 Points négatifs:', points);
    return points;
  }

  /**
   * Calcule les points positifs
   */
  calculatePositivePoints(data) {
    const points = {
      fruitsVegetables: this.getPointsFromTable(data.fruits_vegetables, 'fruits_vegetables_nuts'),
      fiber: this.getPointsFromTable(data.fiber, 'fiber'),
      proteins: this.getPointsFromTable(data.proteins, 'proteins')
    };
    
    points.total = points.fruitsVegetables + points.fiber + points.proteins;
    
    console.log('📊 Points positifs:', points);
    return points;
  }

  /**
   * Obtient les points depuis les tables officielles
   */
  getPointsFromTable(value, nutrient) {
    const isPositive = ['fruits_vegetables_nuts', 'fiber', 'proteins'].includes(nutrient);
    const tableKey = isPositive ? 'positive_points' : 'negative_points';
    const table = this.tables[tableKey][nutrient]?.table;
    
    if (!table) {
      console.warn(`⚠️ Table non trouvée pour: ${nutrient}`);
      return 0;
    }
    
    // Recherche dans la table
    for (const range of table) {
      if (value >= range.min && value < range.max) {
        return range.points;
      }
    }
    
    // Si valeur hors limites, retourner max
    return table[table.length - 1].points;
  }

  /**
   * Détermine le grade A-E
   */
  determineGrade(score, isBeverage = false) {
    const gradeTable = isBeverage ? 
      this.tables.grade_mapping.beverages : 
      this.tables.grade_mapping.solid_foods;
    
    for (const [letter, range] of Object.entries(gradeTable)) {
      if (score >= range.min && score <= range.max) {
        return {
          letter,
          color: range.color,
          range: `${range.min} à ${range.max}`,
          type: isBeverage ? 'beverage' : 'solid_food'
        };
      }
    }
    
    return {
      letter: 'E',
      color: gradeTable.E.color,
      range: '19+',
      type: isBeverage ? 'beverage' : 'solid_food'
    };
  }

  /**
   * Calcule l'impact sur le score ECOLOJIA
   */
  calculateScoringImpact(grade, score) {
    const impactTable = {
      'A': { bonus: 15, description: 'Excellent profil nutritionnel (+15 pts)' },
      'B': { bonus: 8, description: 'Bon profil nutritionnel (+8 pts)' },
      'C': { bonus: 0, description: 'Profil nutritionnel moyen (neutre)' },
      'D': { bonus: -5, description: 'Profil nutritionnel dégradé (-5 pts)' },
      'E': { bonus: -12, description: 'Profil nutritionnel défavorable (-12 pts)' }
    };
    
    const impact = impactTable[grade.letter] || { bonus: 0, description: 'Grade inconnu' };
    
    return {
      bonus: impact.bonus,
      description: impact.description,
      justification: `Nutri-Score ${grade.letter} (${score} points) selon algorithme ANSES`,
      health_relevance: this.getHealthRelevance(grade.letter)
    };
  }

  /**
   * Pertinence santé du grade
   */
  getHealthRelevance(grade) {
    const relevance = {
      'A': 'Profil nutritionnel favorable pour la santé',
      'B': 'Profil nutritionnel plutôt favorable',
      'C': 'Profil nutritionnel moyen à surveiller',
      'D': 'Profil nutritionnel peu favorable',
      'E': 'Profil nutritionnel défavorable pour la santé'
    };
    
    return relevance[grade] || 'Profil nutritionnel non évalué';
  }

  /**
   * Calcule la confiance du calcul
   */
  calculateConfidence(data) {
    const factors = this.tables.confidence_factors.required_data;
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [field, config] of Object.entries(factors)) {
      const hasData = this.hasValidData(data, field);
      const weight = config.weight;
      
      if (hasData) {
        weightedSum += weight;
      }
      
      totalWeight += weight;
    }
    
    const confidence = weightedSum / totalWeight;
    console.log(`📊 Confiance Nutri-Score: ${Math.round(confidence * 100)}%`);
    
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Vérifie si une donnée est valide
   */
  hasValidData(data, field) {
    const fieldMapping = {
      'energy': 'energy_kj',
      'saturated_fat': 'saturated_fat',
      'sugars': 'sugars',
      'sodium': 'sodium',
      'fiber': 'fiber',
      'proteins': 'proteins'
    };
    
    const actualField = fieldMapping[field] || field;
    const value = data[actualField];
    
    return value !== undefined && value !== null && value >= 0;
  }

  /**
   * Retourne les données requises pour un calcul fiable
   */
  getRequiredData() {
    return {
      essential: [
        'energy_kj ou energy_kcal',
        'saturated_fat (g/100g)',
        'sugars (g/100g)',
        'sodium (mg/100g) ou salt (g/100g)'
      ],
      recommended: [
        'fiber (g/100g)',
        'proteins (g/100g)',
        'fruits_vegetables (% estimation)'
      ],
      confidence_threshold: `${this.minConfidence * 100}% minimum requis`
    };
  }

  /**
   * Valide un calcul avec les exemples de référence
   */
  validateWithExamples() {
    console.log('🧪 Validation avec exemples ANSES...');
    
    const examples = this.tables.validation_examples;
    const results = {};
    
    for (const [name, example] of Object.entries(examples)) {
      const calculated = this.calculateNutriScore(example.nutrition);
      const expected = example.expected;
      
      results[name] = {
        calculated_score: calculated.score,
        expected_score: expected.final_score,
        calculated_grade: calculated.grade,
        expected_grade: expected.grade,
        valid: calculated.score === expected.final_score && calculated.grade === expected.grade
      };
      
      console.log(`${results[name].valid ? '✅' : '❌'} ${name}: calculé ${calculated.score}/${calculated.grade}, attendu ${expected.final_score}/${expected.grade}`);
    }
    
    return results;
  }
}

module.exports = NutriScorer;
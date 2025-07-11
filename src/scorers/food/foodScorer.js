const novaClassifier = require('./novaClassifier');
const additivesAnalyzer = require('./additivesAnalyzer');
const confidenceCalculator = require('../common/confidenceCalculator');

/**
 * Calcule le score alimentaire holistique d'un produit
 * @param {Object} productData - Données du produit
 * @param {string} productData.ingredients_text - Liste ingrédients
 * @param {string} productData.product_name - Nom produit
 * @param {Object} productData.nutriments - Données nutritionnelles
 * @returns {Object} Score détaillé avec breakdown
 */
async function calculateFoodScore(productData) {
  try {
    // Validation données minimum
    if (!productData.ingredients_text && !productData.product_name) {
      throw new Error('Données insuffisantes pour analyse');
    }

    const ingredients = productData.ingredients_text || '';
    const productName = productData.product_name || '';
    
    // 1. Classification NOVA (1-4)
    const novaResult = await novaClassifier.classify(ingredients, productName);
    
    // 2. Analyse additifs EFSA
    const additivesResult = await additivesAnalyzer.analyze(ingredients);
    
    // 3. Score de base (traditionnel) - simplifié pour MVP
    const baseScore = calculateBaseScore(productData);
    
    // 4. Application pénalités scientifiques
    const penalties = calculatePenalties(novaResult, additivesResult);
    
    // 5. Score final avec plancher à 0
    const finalScore = Math.max(0, Math.min(100, baseScore - penalties.total));
    
    // 6. Calcul confiance basé sur qualité données
    const confidence = confidenceCalculator.calculate({
      hasIngredients: !!ingredients,
      hasNutriments: !!productData.nutriments,
      novaConfidence: novaResult.confidence,
      additivesConfidence: additivesResult.confidence
    });

    return {
      score: Math.round(finalScore),
      confidence: confidence,
      breakdown: {
        base_score: baseScore,
        penalties: penalties,
        final_score: finalScore
      },
      nova: novaResult,
      additives: additivesResult,
      alternatives_suggested: finalScore < 70, // Seuil alternatives
      education_priority: novaResult.group >= 3 || additivesResult.risk_level === 'high',
      sources: [
        'Classification NOVA - INSERM 2024',
        'Base additifs EFSA 2024',
        'Données OpenFoodFacts sous licence ODbL'
      ]
    };

  } catch (error) {
    console.error('Erreur scoring alimentaire:', error);
    return {
      score: null,
      confidence: 0,
      error: error.message,
      sources: []
    };
  }
}

/**
 * Score de base simplifié (sera enrichi sprints suivants)
 */
function calculateBaseScore(productData) {
  let score = 60; // Score neutre de départ
  
  // Bonus si bio
  if (productData.labels_tags?.includes('en:organic')) {
    score += 15;
  }
  
  // Bonus si local/français
  if (productData.countries_tags?.includes('en:france')) {
    score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Calcul pénalités scientifiques
 */
function calculatePenalties(novaResult, additivesResult) {
  const penalties = {
    nova: 0,
    additives: 0,
    total: 0
  };
  
  // Pénalités NOVA (escalade exponentielle)
  switch(novaResult.group) {
    case 4: penalties.nova = 30; break; // Ultra-transformé
    case 3: penalties.nova = 15; break; // Transformé
    case 2: penalties.nova = 5; break;  // Peu transformé
    case 1: penalties.nova = 0; break;  // Non/minimalement transformé
  }
  
  // Pénalités additifs selon niveau risque
  switch(additivesResult.risk_level) {
    case 'high': penalties.additives = 20; break;
    case 'medium': penalties.additives = 10; break;
    case 'low': penalties.additives = 3; break;
    default: penalties.additives = 0;
  }
  
  penalties.total = penalties.nova + penalties.additives;
  
  return penalties;
}

module.exports = {
  calculateFoodScore
};
const novaRules = require('../../data/nova-rules.json');

/**
 * Classifie un produit selon NOVA (1-4)
 * Basé sur méthodologie officielle INSERM
 */
class NovaClassifier {
  
  /**
   * Classification principale
   * @param {string|Array} ingredients - Liste ingrédients
   * @param {string} productName - Nom produit
   * @returns {Object} Résultat classification
   */
  classify(ingredients, productName = '') {
    try {
      const ingredientsList = this.parseIngredients(ingredients);
      const processMarkers = this.detectProcessMarkers(ingredients, productName);
      
      // Algorithme classification NOVA
      const group = this.determineNovaGroup(ingredientsList, processMarkers);
      const confidence = this.calculateConfidence(ingredientsList, processMarkers);
      
      return {
        group: group,
        confidence: confidence,
        reasoning: this.generateReasoning(group, processMarkers),
        detected_markers: processMarkers,
        ingredients_count: ingredientsList.length,
        classification_date: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Erreur classification NOVA:', error);
      return {
        group: 1, // CORRECTION: Retourner 1 au lieu de null
        confidence: 0.3,
        error: error.message,
        reasoning: ['Erreur classification - Classifié groupe 1 par défaut']
      };
    }
  }
  
  /**
   * Parse la liste d'ingrédients
   */
  parseIngredients(ingredients) {
    if (!ingredients) return [];
    
    // CORRECTION : Gestion array ET string
    let ingredientsText = '';
    if (Array.isArray(ingredients)) {
      ingredientsText = ingredients.join(', ');
    } else if (typeof ingredients === 'string') {
      ingredientsText = ingredients;
    } else {
      return [];
    }
    
    return ingredientsText
      .toLowerCase()
      .split(/[,;().]/)
      .map(ing => ing.trim())
      .filter(ing => ing.length > 2)
      .slice(0, 50); // Limite pour performance
  }
  
  /**
   * Détecte marqueurs ultra-transformation
   */
  detectProcessMarkers(ingredients, productName) {
    const markers = {
      additives_count: 0,
      industrial_ingredients: [],
      process_indicators: [],
      ultra_processed_terms: []
    };
    
    // CORRECTION : Gestion array ET string pour ingredients
    let ingredientsText = '';
    if (Array.isArray(ingredients)) {
      ingredientsText = ingredients.join(' ');
    } else if (typeof ingredients === 'string') {
      ingredientsText = ingredients;
    }
    
    const text = (ingredientsText + ' ' + productName).toLowerCase();
    
    // Comptage E-codes (additifs)
    const ecodes = text.match(/e\d{3,4}/g) || [];
    markers.additives_count = ecodes.length;
    
    // Ingrédients industriels (règles NOVA)
    novaRules.industrial_ingredients.forEach(ingredient => {
      if (text.includes(ingredient.name)) {
        markers.industrial_ingredients.push(ingredient);
      }
    });
    
    // Indicateurs processus industriel
    novaRules.process_indicators.forEach(process => {
      if (text.includes(process)) {
        markers.process_indicators.push(process);
      }
    });
    
    // Termes ultra-transformés
    novaRules.ultra_processed_terms.forEach(term => {
      if (text.includes(term) || productName.toLowerCase().includes(term)) {
        markers.ultra_processed_terms.push(term);
      }
    });
    
    return markers;
  }
  
  /**
   * Détermine groupe NOVA selon règles officielles
   */
  determineNovaGroup(ingredientsList, markers) {
    // Groupe 4 : Ultra-transformé
    if (markers.additives_count >= 3 || 
        markers.industrial_ingredients.length >= 2 ||
        markers.ultra_processed_terms.length >= 1) {
      return 4;
    }
    
    // Groupe 3 : Transformé  
    if (markers.additives_count >= 1 || 
        markers.process_indicators.length >= 1 ||
        ingredientsList.length >= 8) {
      return 3;
    }
    
    // Groupe 2 : Peu transformé
    if (ingredientsList.length >= 3 && ingredientsList.length <= 7) {
      return 2;
    }
    
    // Groupe 1 : Non/minimalement transformé
    return 1;
  }
  
  /**
   * Calcule confiance classification (0-1)
   */
  calculateConfidence(ingredientsList, markers) {
    let confidence = 0.3; // Base minimum
    
    // Bonus si données riches
    if (ingredientsList.length > 0) confidence += 0.3;
    if (markers.additives_count > 0) confidence += 0.2;
    if (markers.industrial_ingredients.length > 0) confidence += 0.2;
    
    return Math.min(1.0, confidence);
  }
  
  /**
   * Génère explication classification
   */
  generateReasoning(group, markers) {
    const reasons = [];
    
    switch(group) {
      case 4:
        if (markers.additives_count >= 3) {
          reasons.push(`${markers.additives_count} additifs détectés (seuil ultra-transformation)`);
        }
        if (markers.industrial_ingredients.length >= 2) {
          reasons.push(`Ingrédients industriels: ${markers.industrial_ingredients.map(i => i.name).join(', ')}`);
        }
        if (markers.ultra_processed_terms.length >= 1) {
          reasons.push(`Termes ultra-transformés: ${markers.ultra_processed_terms.join(', ')}`);
        }
        break;
        
      case 3:
        if (markers.additives_count >= 1) {
          reasons.push(`${markers.additives_count} additif(s) présent(s)`);
        }
        if (markers.process_indicators.length >= 1) {
          reasons.push(`Processus industriel: ${markers.process_indicators.join(', ')}`);
        }
        break;
        
      case 2:
        reasons.push('Produit peu transformé (3-7 ingrédients)');
        break;
        
      case 1:
        reasons.push('Produit non ou minimalement transformé');
        break;
    }
    
    return reasons;
  }
}

// CORRECTION EXPORT : Exporter la CLASSE, pas l'instance
module.exports = NovaClassifier;
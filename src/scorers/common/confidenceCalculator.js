/**
 * Calcule score de confiance global (0-1)
 * Basé sur qualité et complétude des données
 */
class ConfidenceCalculator {
  
  /**
   * Calcul principal
   * @param {Object} factors - Facteurs de confiance
   * @returns {number} Score 0-1
   */
  calculate(factors) {
    try {
      let confidence = 0.2; // Base minimum
      
      // Qualité données entrée
      if (factors.hasIngredients) confidence += 0.3;
      if (factors.hasNutriments) confidence += 0.2;
      
      // Confiance analyses spécialisées
      if (factors.novaConfidence) {
        confidence += factors.novaConfidence * 0.25;
      }
      
      if (factors.additivesConfidence) {
        confidence += factors.additivesConfidence * 0.25;
      }
      
      // Plafonnement
      return Math.min(1.0, Math.round(confidence * 100) / 100);
      
    } catch (error) {
      console.error('Erreur calcul confiance:', error);
      return 0.1; // Confiance minimum si erreur
    }
  }
  
  /**
   * Interprétation textuelle du score
   * @param {number} confidence - Score 0-1
   * @returns {string} Interprétation
   */
  getInterpretation(confidence) {
    if (confidence >= 0.8) return 'Très fiable';
    if (confidence >= 0.6) return 'Fiable';
    if (confidence >= 0.4) return 'Modérément fiable';
    return 'Peu fiable';
  }
  
  /**
   * Détermine si publication autorisée
   * @param {number} confidence - Score 0-1
   * @returns {boolean} Autorisation publication
   */
  isPublishable(confidence) {
    return confidence >= 0.4; // Seuil minimum légal
  }
}

// CORRECTION EXPORT : Exporter la CLASSE, pas l'instance
module.exports = ConfidenceCalculator;
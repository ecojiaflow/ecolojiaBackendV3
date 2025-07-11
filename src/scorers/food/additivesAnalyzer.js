const additivesEfsa = require('../../data/additives-efsa.json');

/**
 * Analyse les additifs alimentaires selon données EFSA
 */
class AdditivesAnalyzer {
  
  /**
   * Analyse principale additifs
   * @param {string|Array} ingredients - Liste ingrédients
   * @returns {Object} Analyse détaillée
   */
  analyze(ingredients) {
    try {
      const detectedAdditives = this.detectAdditives(ingredients);
      const riskAnalysis = this.assessRisk(detectedAdditives);
      const microbiomeImpact = this.assessMicrobiomeImpact(detectedAdditives);
      
      return {
        total: detectedAdditives.length, // CORRECTION: Ajouter 'total'
        microbiomeDisruptors: microbiomeImpact.affected_additives.length, // CORRECTION
        controversial: detectedAdditives.filter(a => a.efsa_assessment?.risk_level === 'high').length, // CORRECTION
        additives_count: detectedAdditives.length,
        detected_additives: detectedAdditives,
        risk_level: riskAnalysis.level,
        risk_factors: riskAnalysis.factors,
        microbiome_impact: microbiomeImpact,
        confidence: this.calculateConfidence(detectedAdditives),
        efsa_sources: this.getEfsaSources(detectedAdditives)
      };
      
    } catch (error) {
      console.error('Erreur analyse additifs:', error);
      return {
        total: 0, // CORRECTION
        microbiomeDisruptors: 0, // CORRECTION
        controversial: 0, // CORRECTION
        additives_count: 0,
        confidence: 0.8, // CORRECTION: Pas d'additifs = confiance élevée
        error: error.message
      };
    }
  }
  
  /**
   * Détecte additifs dans ingrédients
   */
  detectAdditives(ingredients) {
    if (!ingredients) return [];
    
    const detected = [];
    
    // CORRECTION : Gestion array ET string
    let text = '';
    if (Array.isArray(ingredients)) {
      text = ingredients.join(' ').toLowerCase();
    } else if (typeof ingredients === 'string') {
      text = ingredients.toLowerCase();
    } else {
      return [];
    }
    
    // Détection E-codes
    const ecodes = text.match(/e\s*(\d{3,4})/g) || [];
    ecodes.forEach(ecode => {
      const number = ecode.replace(/\D/g, '');
      const additive = additivesEfsa.additives.find(a => a.e_number === `E${number}`);
      if (additive) {
        detected.push(additive);
      }
    });
    
    // Détection noms communs
    additivesEfsa.additives.forEach(additive => {
      additive.common_names.forEach(name => {
        if (text.includes(name.toLowerCase())) {
          if (!detected.find(d => d.e_number === additive.e_number)) {
            detected.push(additive);
          }
        }
      });
    });
    
    return detected;
  }
  
  /**
   * Évalue niveau de risque global
   */
  assessRisk(additives) {
    const riskFactors = [];
    let maxRiskLevel = 'low';
    
    additives.forEach(additive => {
      // Priorité au niveau EFSA le plus élevé
      if (additive.efsa_assessment.risk_level === 'high') {
        maxRiskLevel = 'high';
      } else if (additive.efsa_assessment.risk_level === 'medium' && maxRiskLevel !== 'high') {
        maxRiskLevel = 'medium';
      }
      
      // Collecte facteurs de risque
      if (additive.efsa_assessment.concerns.length > 0) {
        riskFactors.push(...additive.efsa_assessment.concerns);
      }
    });
    
    // Escalade si trop d'additifs
    if (additives.length >= 5) {
      maxRiskLevel = 'high';
      riskFactors.push('Cocktail d\'additifs (effet cumulatif)');
    } else if (additives.length >= 3 && maxRiskLevel === 'low') {
      maxRiskLevel = 'medium';
    }
    
    return {
      level: maxRiskLevel,
      factors: [...new Set(riskFactors)] // Déduplique
    };
  }
  
  /**
   * Évalue impact sur microbiote intestinal
   */
  assessMicrobiomeImpact(additives) {
    const impacts = [];
    
    additives.forEach(additive => {
      if (additive.microbiome_impact) {
        impacts.push({
          additive: additive.e_number,
          impact: additive.microbiome_impact,
          severity: additive.microbiome_severity || 'unknown'
        });
      }
    });
    
    // Synthèse impact global
    const severities = impacts.map(i => i.severity);
    let globalImpact = 'minimal';
    
    if (severities.includes('severe')) {
      globalImpact = 'severe';
    } else if (severities.includes('moderate')) {
      globalImpact = 'moderate';
    } else if (impacts.length >= 2) {
      globalImpact = 'moderate'; // Effet cumulatif
    }
    
    return {
      global_impact: globalImpact,
      affected_additives: impacts,
      research_note: impacts.length > 0 ? 
        'Données basées sur études récentes 2020-2024' : null
    };
  }
  
  /**
   * Calcule confiance analyse
   */
  calculateConfidence(additives) {
    if (additives.length === 0) return 0.8; // Pas d'additifs = confiance élevée
    
    // Confiance basée sur couverture base EFSA
    const knownAdditives = additives.filter(a => a.efsa_assessment);
    const coverage = knownAdditives.length / additives.length;
    
    return Math.max(0.4, coverage * 0.9);
  }
  
  /**
   * Sources EFSA pour additifs détectés
   */
  getEfsaSources(additives) {
    const sources = [];
    
    additives.forEach(additive => {
      if (additive.efsa_assessment && additive.efsa_assessment.source_url) {
        sources.push({
          additive: additive.e_number,
          source: additive.efsa_assessment.source_url,
          date: additive.efsa_assessment.assessment_date
        });
      }
    });
    
    return sources;
  }
}

// CORRECTION EXPORT : Exporter la CLASSE, pas l'instance
module.exports = AdditivesAnalyzer;
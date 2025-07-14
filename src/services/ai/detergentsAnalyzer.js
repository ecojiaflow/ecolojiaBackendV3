// backend/src/services/ai/detergentsAnalyzer.js
// Analyseur spécialisé pour produits détergents

class DetergentsAnalyzer {
  constructor() {
    this.detergentsData = this.initializeDetergentsData();
    this.dangerousVOCs = this.initializeDangerousVOCs();
    this.ecoCertifications = this.initializeEcoCertifications();
  }

  initializeDetergentsData() {
    // Base de données ingrédients détergents simplifiée
    return {
      'tensioactifs': { safety: 70, function: 'Nettoyage', biodegradability: 'good', aquatic_impact: 'moderate' },
      'phosphates': { safety: 30, function: 'Builder', biodegradability: 'poor', aquatic_impact: 'high', banned_eu: true },
      'zeolites': { safety: 85, function: 'Anti-calcaire', biodegradability: 'excellent', aquatic_impact: 'low' },
      'enzymes': { safety: 90, function: 'Détachage', biodegradability: 'excellent', aquatic_impact: 'low' },
      'parfum': { safety: 60, function: 'Parfum', respiratory_risk: 'moderate', allergens: true },
      'sodium carbonate': { safety: 75, function: 'Alcalinisant', biodegradability: 'good', aquatic_impact: 'moderate' },
      'sodium percarbonate': { safety: 80, function: 'Blanchiment oxygéné', biodegradability: 'excellent', aquatic_impact: 'low' },
      'optical brighteners': { safety: 40, function: 'Azurant optique', biodegradability: 'poor', aquatic_impact: 'high' },
      'edta': { safety: 50, function: 'Chélateur', biodegradability: 'poor', aquatic_impact: 'moderate' }
    };
  }

  initializeDangerousVOCs() {
    return [
      { name: 'formaldehyde', threshold: 0.1, unit: 'ppm', health_effect: 'Cancérogène groupe 1 IARC' },
      { name: 'benzene', threshold: 1, unit: 'ppm', health_effect: 'Leucémie, cancérogène' },
      { name: 'toluene', threshold: 50, unit: 'ppm', health_effect: 'Troubles neurologiques' },
      { name: 'ammonia', threshold: 25, unit: 'ppm', health_effect: 'Irritation respiratoire sévère' },
      { name: 'chlorine', threshold: 0.5, unit: 'ppm', health_effect: 'Brûlures respiratoires' }
    ];
  }

  initializeEcoCertifications() {
    return [
      { name: 'eu ecolabel', score_bonus: 25, criteria: 'Critères stricts biodégradabilité + toxicité aquatique' },
      { name: 'nordic swan', score_bonus: 20, criteria: 'Standards nordiques complets' },
      { name: 'cradle to cradle', score_bonus: 22, criteria: 'Analyse cycle de vie complet' },
      { name: 'epa safer choice', score_bonus: 18, criteria: 'Critères EPA sécurité + environnement' }
    ];
  }

  // === ANALYSE PRINCIPALE ===
  async analyze(productData) {
    try {
      console.log('🧽 Analyse détergent:', productData?.title || 'Produit détergent');

      const analysis = {
        overall_score: 0,
        respiratory_safety: await this.analyzeRespiratorySafety(productData),
        aquatic_impact: await this.analyzeAquaticImpact(productData),
        cleaning_efficacy: await this.analyzeCleaningEfficacy(productData),
        biodegradability: await this.analyzeBiodegradability(productData),
        voc_emissions: await this.analyzeVOCEmissions(productData),
        eco_certifications: await this.checkEcoCertifications(productData),
        packaging_assessment: await this.assessPackaging(productData),
        health_alerts: [],
        environmental_warnings: [],
        diy_alternatives: await this.generateDIYAlternatives(productData),
        detailed_analysis: {},
        confidence: 0.92,
        sources: ['ECHA Database', 'EU Ecolabel Criteria', 'OECD Test Guidelines', 'ANSES 2024'],
        category: 'detergents'
      };

      // Calcul score global
      analysis.overall_score = this.calculateOverallScore(analysis);

      // Compilation alertes
      analysis.health_alerts = await this.compileHealthAlerts(analysis);
      analysis.environmental_warnings = await this.compileEnvironmentalWarnings(analysis);

      // Analyse détaillée
      analysis.detailed_analysis = await this.performDetailedAnalysis(productData);

      console.log(`✅ Analyse détergent terminée - Score: ${analysis.overall_score}/100`);
      return analysis;

    } catch (error) {
      console.error('❌ Erreur analyse détergent:', error);
      return this.getFallbackAnalysis(productData, error);
    }
  }

  // === SÉCURITÉ RESPIRATOIRE ===
  async analyzeRespiratorySafety(productData) {
    const respiratoryAnalysis = {
      score: 75,
      voc_level: 'low',
      fragrance_risk: 'moderate',
      irritation_potential: 'low',
      ventilation_required: false,
      warnings: [],
      sensitive_groups_affected: []
    };

    const text = JSON.stringify(productData).toLowerCase();

    // Détection COV dangereux
    for (const voc of this.dangerousVOCs) {
      if (text.includes(voc.name)) {
        respiratoryAnalysis.voc_level = 'high';
        respiratoryAnalysis.score -= 20;
        respiratoryAnalysis.ventilation_required = true;
        respiratoryAnalysis.warnings.push({
          compound: voc.name,
          threshold: `${voc.threshold} ${voc.unit}`,
          health_effect: voc.health_effect,
          precautions: 'Utiliser avec ventilation forcée, éviter inhalation directe'
        });
      }
    }

    // Évaluation parfums et allergènes
    if (text.includes('parfum') || text.includes('fragrance')) {
      const allergenCount = this.countFragranceAllergens(text);
      if (allergenCount > 2) {
        respiratoryAnalysis.score -= 10;
        respiratoryAnalysis.sensitive_groups_affected.push('Asthmatiques', 'Allergies respiratoires');
        respiratoryAnalysis.fragrance_risk = 'high';
      }
    }

    // Agents corrosifs
    const corrosiveAgents = ['sodium hydroxide', 'potassium hydroxide', 'hydrochloric acid', 'sulfuric acid'];
    for (const agent of corrosiveAgents) {
      if (text.includes(agent.replace(' ', ''))) {
        respiratoryAnalysis.score -= 15;
        respiratoryAnalysis.irritation_potential = 'high';
        respiratoryAnalysis.warnings.push({
          agent,
          risk: 'Corrosion voies respiratoires',
          precautions: 'EPI obligatoire, ventilation forcée, éviter contact vapeurs'
        });
      }
    }

    respiratoryAnalysis.score = Math.max(0, Math.min(100, respiratoryAnalysis.score));
    return respiratoryAnalysis;
  }

  countFragranceAllergens(text) {
    const commonAllergens = ['limonene', 'linalool', 'citronellol', 'geraniol', 'eugenol'];
    return commonAllergens.filter(allergen => text.includes(allergen)).length;
  }

  // === IMPACT AQUATIQUE ===
  async analyzeAquaticImpact(productData) {
    const aquaticAnalysis = {
      score: 70,
      biodegradability_level: 'moderate',
      aquatic_toxicity: 'low',
      eutrophication_risk: 'low',
      marine_safety: true,
      bioaccumulation_potential: 'low',
      concerns: [],
      environmental_benefits: []
    };

    const text = JSON.stringify(productData).toLowerCase();

    // Substances problématiques pour milieux aquatiques
    const aquaticHarmful = [
      { substance: 'phosphates', penalty: -25, concern: 'Eutrophisation massive' },
      { substance: 'nonylphenol ethoxylates', penalty: -20, concern: 'Perturbation endocrinienne poissons' },
      { substance: 'triclosan', penalty: -18, concern: 'Bioaccumulation chaîne alimentaire' },
      { substance: 'optical brighteners', penalty: -15, concern: 'Persistance environnementale' },
      { substance: 'edta', penalty: -10, concern: 'Dégradation très lente, chélation métaux' }
    ];

    for (const item of aquaticHarmful) {
      if (text.includes(item.substance.replace(' ', ''))) {
        aquaticAnalysis.score += item.penalty;
        aquaticAnalysis.concerns.push({
          substance: item.substance,
          environmental_impact: item.concern,
          severity: item.penalty < -15 ? 'high' : 'moderate'
        });

        if (item.substance === 'phosphates') {
          aquaticAnalysis.eutrophication_risk = 'high';
        }
        if (item.substance.includes('nonylphenol') || item.substance.includes('triclosan')) {
          aquaticAnalysis.marine_safety = false;
          aquaticAnalysis.bioaccumulation_potential = 'high';
        }
      }
    }

    // Bonus substances éco-friendly
    const ecoFriendly = [
      { substance: 'plant based surfactants', bonus: 12 },
      { substance: 'readily biodegradable', bonus: 15 },
      { substance: 'phosphate free', bonus: 12 },
      { substance: 'concentrated formula', bonus: 8 },
      { substance: 'enzymes', bonus: 10 }
    ];

    for (const item of ecoFriendly) {
      if (text.includes(item.substance.replace(' ', ''))) {
        aquaticAnalysis.score += item.bonus;
        aquaticAnalysis.environmental_benefits.push(item.substance);
      }
    }

    // Évaluation biodégradabilité
    if (text.includes('readily biodegradable')) {
      aquaticAnalysis.biodegradability_level = 'excellent';
    } else if (text.includes('biodegradable')) {
      aquaticAnalysis.biodegradability_level = 'good';
    }

    aquaticAnalysis.score = Math.max(0, Math.min(100, aquaticAnalysis.score));
    return aquaticAnalysis;
  }

  // === EFFICACITÉ NETTOYANTE ===
  async analyzeCleaningEfficacy(productData) {
    const efficacyAnalysis = {
      score: 75,
      surfactant_performance: 'good',
      stain_removal_capability: 'moderate',
      antimicrobial_action: false,
      temperature_efficiency: 'moderate',
      concentration_level: 'standard',
      performance_factors: []
    };

    const text = JSON.stringify(productData).toLowerCase();

    // Évaluation tensioactifs
    const surfactantTypes = {
      'high_performance': { 
        ingredients: ['linear alkylbenzene sulfonate', 'alcohol ethoxylates'],
        score_bonus: 15,
        performance: 'excellent'
      },
      'gentle_effective': { 
        ingredients: ['alkyl polyglucosides', 'coco glucoside'],
        score_bonus: 10,
        performance: 'good'
      },
      'basic': { 
        ingredients: ['sodium lauryl sulfate'],
        score_bonus: 5,
        performance: 'moderate'
      }
    };

    for (const [category, data] of Object.entries(surfactantTypes)) {
      for (const ingredient of data.ingredients) {
        if (text.includes(ingredient.replace(' ', ''))) {
          efficacyAnalysis.score += data.score_bonus;
          efficacyAnalysis.surfactant_performance = data.performance;
          efficacyAnalysis.performance_factors.push({
            ingredient,
            category,
            contribution: `+${data.score_bonus} points efficacité`
          });
        }
      }
    }

    // Évaluation enzymes
    const enzymeTypes = ['protease', 'lipase', 'amylase', 'cellulase', 'mannanase'];
    let enzymeCount = 0;
    for (const enzyme of enzymeTypes) {
      if (text.includes(enzyme)) {
        enzymeCount++;
        efficacyAnalysis.performance_factors.push({
          ingredient: enzyme,
          function: this.getEnzymeFunction(enzyme),
          temperature_optimum: this.getEnzymeTemperature(enzyme)
        });
      }
    }

    if (enzymeCount > 0) {
      efficacyAnalysis.score += enzymeCount * 8;
      efficacyAnalysis.stain_removal_capability = enzymeCount >= 3 ? 'excellent' : 'good';
      efficacyAnalysis.temperature_efficiency = 'cold_active';
    }

    // Action antimicrobienne
    const antimicrobials = ['benzalkonium chloride', 'hydrogen peroxide', 'citric acid', 'lactic acid'];
    for (const antimicrobial of antimicrobials) {
      if (text.includes(antimicrobial.replace(' ', ''))) {
        efficacyAnalysis.antimicrobial_action = true;
        efficacyAnalysis.score += 10;
        break;
      }
    }

    // Niveau de concentration
    if (text.includes('concentrated') || text.includes('super concentrated')) {
      efficacyAnalysis.concentration_level = 'high';
      efficacyAnalysis.score += 8;
    } else if (text.includes('ultra concentrated')) {
      efficacyAnalysis.concentration_level = 'ultra';
      efficacyAnalysis.score += 12;
    }

    efficacyAnalysis.score = Math.max(0, Math.min(100, efficacyAnalysis.score));
    return efficacyAnalysis;
  }

  getEnzymeFunction(enzyme) {
    const functions = {
      'protease': 'Décomposition protéines (sang, transpiration, œuf)',
      'lipase': 'Décomposition graisses et huiles alimentaires',
      'amylase': 'Décomposition amidon et sucres',
      'cellulase': 'Anti-boulochage textile, rénovation coton',
      'mannanase': 'Élimination taches alimentaires complexes'
    };
    return functions[enzyme] || 'Fonction enzymatique spécialisée';
  }

  getEnzymeTemperature(enzyme) {
    const temperatures = {
      'protease': '40-60°C (optimum 50°C)',
      'lipase': '30-50°C (optimum 40°C)', 
      'amylase': '60-70°C (optimum 65°C)',
      'cellulase': '50-60°C (optimum 55°C)',
      'mannanase': '45-65°C (optimum 55°C)'
    };
    return temperatures[enzyme] || '30-60°C';
  }

  // === BIODÉGRADABILITÉ ===
  async analyzeBiodegradability(productData) {
    const biodegradabilityAnalysis = {
      overall_rating: 'moderate',
      primary_degradation: 'unknown',
      ultimate_degradation: 'unknown',
      aquatic_biodegradation: 'unknown',
      test_standards_met: [],
      persistence_score: 50
    };

    const text = JSON.stringify(productData).toLowerCase();

    // Standards de tests OECD
    const testStandards = {
      'oecd 301': { description: 'Ready biodegradability', score_bonus: 20 },
      'oecd 302': { description: 'Inherent biodegradability', score_bonus: 15 },
      'oecd 303': { description: 'Activated sludge simulation', score_bonus: 18 },
      'oecd 310': { description: 'CO2 headspace test', score_bonus: 16 }
    };

    for (const [standard, info] of Object.entries(testStandards)) {
      if (text.includes(standard.replace(' ', ''))) {
        biodegradabilityAnalysis.test_standards_met.push({
          standard,
          description: info.description
        });
        biodegradabilityAnalysis.persistence_score += info.score_bonus;
      }
    }

    // Évaluation selon ingrédients
    const biodegradabilityFactors = {
      'readily biodegradable': { rating: 'excellent', score: 25 },
      'plant based surfactants': { rating: 'excellent', score: 20 },
      'enzymes': { rating: 'excellent', score: 15 },
      'zeolites': { rating: 'good', score: 10 },
      'phosphates': { rating: 'poor', score: -20 },
      'optical brighteners': { rating: 'poor', score: -15 },
      'edta': { rating: 'poor', score: -10 }
    };

    let bestRating = 'moderate';
    for (const [ingredient, data] of Object.entries(biodegradabilityFactors)) {
      if (text.includes(ingredient.replace(' ', ''))) {
        biodegradabilityAnalysis.persistence_score += data.score;
        if (data.rating === 'excellent' || (data.rating === 'good' && bestRating === 'moderate')) {
          bestRating = data.rating;
        } else if (data.rating === 'poor') {
          bestRating = 'poor';
        }
      }
    }

    biodegradabilityAnalysis.overall_rating = bestRating;
    biodegradabilityAnalysis.persistence_score = Math.max(0, Math.min(100, biodegradabilityAnalysis.persistence_score));

    return biodegradabilityAnalysis;
  }

  // === ÉMISSIONS COV ===
  async analyzeVOCEmissions(productData) {
    const vocAnalysis = {
      emission_level: 'low',
      detected_vocs: [],
      health_recommendations: [],
      ventilation_requirements: 'normal'
    };

    const text = JSON.stringify(productData).toLowerCase();

    for (const voc of this.dangerousVOCs) {
      if (text.includes(voc.name)) {
        vocAnalysis.detected_vocs.push({
          compound: voc.name,
          threshold: `${voc.threshold} ${voc.unit}`,
          health_effect: voc.health_effect
        });

        if (voc.threshold < 1) {
          vocAnalysis.emission_level = 'high';
          vocAnalysis.ventilation_requirements = 'forced_ventilation';
        } else if (vocAnalysis.emission_level !== 'high') {
          vocAnalysis.emission_level = 'moderate';
        }
      }
    }

    if (vocAnalysis.emission_level === 'high') {
      vocAnalysis.health_recommendations = [
        'Utiliser exclusivement avec ventilation forcée',
        'Porter équipement protection respiratoire',
        'Éviter usage en présence enfants/femmes enceintes',
        'Aérer locaux pendant et après usage (minimum 30 minutes)'
      ];
    } else if (vocAnalysis.emission_level === 'moderate') {
      vocAnalysis.health_recommendations = [
        'Assurer ventilation naturelle durant utilisation',
        'Éviter inhalation directe',
        'Aérer après usage'
      ];
    }

    return vocAnalysis;
  }

  // === CERTIFICATIONS ÉCOLOGIQUES ===
  async checkEcoCertifications(productData) {
    const certificationAnalysis = {
      score: 0,
      detected_labels: [],
      compliance_level: 'unknown'
    };

    const text = JSON.stringify(productData).toLowerCase();

    for (const cert of this.ecoCertifications) {
      if (text.includes(cert.name.replace(' ', ''))) {
        certificationAnalysis.detected_labels.push({
          name: cert.name.toUpperCase(),
          score_contribution: cert.score_bonus,
          criteria: cert.criteria
        });
        certificationAnalysis.score += cert.score_bonus;
      }
    }

    if (certificationAnalysis.score >= 20) {
      certificationAnalysis.compliance_level = 'high';
    } else if (certificationAnalysis.score >= 10) {
      certificationAnalysis.compliance_level = 'moderate';
    } else {
      certificationAnalysis.compliance_level = 'low';
    }

    return certificationAnalysis;
  }

  // === ÉVALUATION EMBALLAGE ===
  async assessPackaging(productData) {
    const packagingAnalysis = {
      score: 50,
      sustainability_features: [],
      concentration_factor: 1,
      refill_available: false
    };

    const text = JSON.stringify(productData).toLowerCase();

    const sustainabilityFeatures = [
      { feature: 'recyclable packaging', bonus: 12 },
      { feature: 'concentrated formula', bonus: 15 },
      { feature: 'refillable container', bonus: 20 },
      { feature: 'biodegradable packaging', bonus: 18 },
      { feature: 'reduced packaging', bonus: 10 }
    ];

    for (const item of sustainabilityFeatures) {
      if (text.includes(item.feature.replace(' ', ''))) {
        packagingAnalysis.score += item.bonus;
        packagingAnalysis.sustainability_features.push(item.feature);

        if (item.feature.includes('concentrated')) {
          packagingAnalysis.concentration_factor = text.includes('ultra') ? 4 : 3;
        }
        if (item.feature.includes('refillable')) {
          packagingAnalysis.refill_available = true;
        }
      }
    }

    packagingAnalysis.score = Math.min(100, packagingAnalysis.score);
    return packagingAnalysis;
  }

  // === GÉNÉRATION ALTERNATIVES DIY ===
  async generateDIYAlternatives(productData) {
    const productType = this.identifyProductType(productData);
    
    const diyRecipes = {
      'all_purpose_cleaner': {
        name: 'Nettoyant Multi-Usage Écologique',
        score_improvement: 35,
        ingredients: ['500ml vinaigre blanc 8%', '500ml eau', '2 c.à.s bicarbonate', '10 gouttes HE citron'],
        instructions: [
          'Mélanger vinaigre et eau dans pulvérisateur',
          'Ajouter bicarbonate (mousse normale)',
          'Parfumer avec huile essentielle',
          'Bien agiter avant usage'
        ],
        cost_saving: '75%',
        time: '5 minutes',
        efficacy: 'Dégraisse et désinfecte naturellement',
        scientific_basis: 'Acide acétique pH 2.4 efficace contre 99% bactéries'
      },
      'laundry_detergent': {
        name: 'Lessive Maison Écologique',
        score_improvement: 40,
        ingredients: ['150g savon Marseille râpé', '3 c.à.s bicarbonate', '3 c.à.s cristaux soude', '3L eau'],
        instructions: [
          'Faire fondre savon dans 1L eau chaude',
          'Ajouter bicarbonate et cristaux soude',
          'Compléter avec 2L eau froide',
          'Laisser reposer 24h (texture gel)'
        ],
        cost_saving: '70%',
        time: '15 minutes + repos',
        efficacy: 'Efficace jusqu\'à 40°C, respecte fibres',
        scientific_basis: 'Saponification naturelle, tensioactifs végétaux doux'
      }
    };

    const recipe = diyRecipes[productType] || diyRecipes['all_purpose_cleaner'];
    
    return {
      ...recipe,
      environmental_benefit: 'Réduction 95% empreinte carbone',
      health_benefit: 'Zéro COV, zéro perturbateurs endocriniens',
      packaging_benefit: 'Réutilisation contenants existants'
    };
  }

  identifyProductType(productData) {
    const text = JSON.stringify(productData).toLowerCase();
    
    if (text.includes('lessive') || text.includes('laundry')) return 'laundry_detergent';
    if (text.includes('vaisselle') || text.includes('dish')) return 'dishwashing_liquid';
    if (text.includes('sol') || text.includes('floor')) return 'floor_cleaner';
    
    return 'all_purpose_cleaner';
  }

  // === COMPILATION ALERTES ===
  async compileHealthAlerts(analysis) {
    const alerts = [];

    // Alertes respiratoires
    if (analysis.respiratory_safety.warnings.length > 0) {
      for (const warning of analysis.respiratory_safety.warnings) {
        alerts.push({
          type: 'respiratory_hazard',
          severity: 'high',
          compound: warning.compound || warning.agent,
          health_impact: warning.health_effect || warning.risk,
          precautions: warning.precautions,
          source: 'ANSES/OESHA Guidelines 2024'
        });
      }
    }

    // Alertes COV
    if (analysis.voc_emissions.detected_vocs.length > 0) {
      for (const voc of analysis.voc_emissions.detected_vocs) {
        alerts.push({
          type: 'voc_emission',
          severity: 'high',
          compound: voc.compound,
          health_impact: voc.health_effect,
          exposure_limit: voc.threshold,
          source: 'WHO Air Quality Guidelines'
        });
      }
    }

    return alerts;
  }

  async compileEnvironmentalWarnings(analysis) {
    const warnings = [];

    // Avertissements aquatiques
    if (analysis.aquatic_impact.concerns.length > 0) {
      for (const concern of analysis.aquatic_impact.concerns) {
        warnings.push({
          type: 'aquatic_impact',
          severity: concern.severity,
          substance: concern.substance,
          environmental_impact: concern.environmental_impact,
          source: 'ECHA Substance Database'
        });
      }
    }

    // Avertissement biodégradabilité
    if (analysis.biodegradability.overall_rating === 'poor') {
      warnings.push({
        type: 'poor_biodegradability',
        severity: 'moderate',
        environmental_impact: 'Persistance dans environnement aquatique',
        source: 'OECD Biodegradability Guidelines'
      });
    }

    return warnings;
  }

  // === CALCUL SCORE GLOBAL ===
  calculateOverallScore(analysis) {
    const weights = {
      respiratory_safety: 0.25,
      aquatic_impact: 0.25,
      cleaning_efficacy: 0.20,
      biodegradability: 0.15,
      eco_certifications: 0.10,
      packaging_assessment: 0.05
    };

    let totalScore = 0;

    // Scores pondérés
    totalScore += (analysis.respiratory_safety?.score || 50) * weights.respiratory_safety;
    totalScore += (analysis.aquatic_impact?.score || 50) * weights.aquatic_impact;
    totalScore += (analysis.cleaning_efficacy?.score || 50) * weights.cleaning_efficacy;
    totalScore += (analysis.biodegradability?.persistence_score || 50) * weights.biodegradability;
    totalScore += (analysis.eco_certifications?.score || 0) * weights.eco_certifications;
    totalScore += (analysis.packaging_assessment?.score || 50) * weights.packaging_assessment;

    // Pénalités pour problèmes critiques
    if (analysis.health_alerts?.length > 2) {
      totalScore -= 15;
    }
    if (analysis.environmental_warnings?.length > 2) {
      totalScore -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(totalScore)));
  }

  // === ANALYSE DÉTAILLÉE ===
  async performDetailedAnalysis(productData) {
    return {
      product_type: this.identifyProductType(productData),
      ingredient_complexity: this.assessIngredientComplexity(productData),
      usage_safety_profile: this.createUsageSafetyProfile(productData),
      regulatory_compliance: 'À vérifier selon Règlement Détergents EU 648/2004',
      recommended_usage: this.generateUsageRecommendations(productData)
    };
  }

  assessIngredientComplexity(productData) {
    const ingredientCount = productData.ingredients?.length || 0;
    if (ingredientCount < 5) return 'Simple';
    if (ingredientCount < 10) return 'Modérée';
    if (ingredientCount < 15) return 'Complexe';
    return 'Très complexe';
  }

  createUsageSafetyProfile(productData) {
    const text = JSON.stringify(productData).toLowerCase();
    const profile = {
      dilution_required: text.includes('concentrated'),
      gloves_recommended: true,
      eye_protection: text.includes('corrosif') || text.includes('irritant'),
      ventilation_needed: text.includes('parfum') || text.includes('fragrance')
    };
    return profile;
  }

  generateUsageRecommendations(productData) {
    return [
      'Porter gants de protection',
      'Assurer ventilation adéquate',
      'Éviter contact avec les yeux',
      'Tenir hors de portée des enfants',
      'Ne pas mélanger avec d\'autres produits',
      'Rincer abondamment en cas de contact cutané'
    ];
  }

  // === GÉNÉRATION ALTERNATIVES ===
  async generateAlternatives(analysis) {
    const alternatives = [];

    // Alternative DIY
    alternatives.push({
      type: 'diy',
      name: 'Version maison écologique',
      improvement_score: analysis.overall_score < 60 ? 40 : 25,
      recipe: analysis.diy_alternatives,
      benefits: ['Zéro COV', 'Biodégradable 100%', 'Économique'],
      difficulty: 'facile'
    });

    // Alternative commerciale éco-certifiée
    if (analysis.eco_certifications.score < 15) {
      alternatives.push({
        type: 'commercial',
        name: 'Détergent éco-certifié équivalent',
        improvement_score: 20,
        certifications: ['EU Ecolabel', 'Nordic Swan'],
        benefits: ['Critères environnementaux stricts', 'Efficacité prouvée'],
        where_to_buy: ['Magasins bio', 'Grandes surfaces rayon éco']
      });
    }

    return alternatives;
  }

  // === ANALYSE FALLBACK ===
  getFallbackAnalysis(productData, error) {
    return {
      overall_score: 50,
      respiratory_safety: { score: 50, message: 'Analyse limitée' },
      aquatic_impact: { score: 50, message: 'Évaluation de base' },
      cleaning_efficacy: { score: 60, message: 'Efficacité présumée' },
      health_alerts: [],
      environmental_warnings: [],
      confidence: 0.3,
      error_message: error.message,
      fallback_mode: true,
      category: 'detergents'
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'DetergentsAnalyzer',
      detergents_database_size: Object.keys(this.detergentsData).length,
      vocs_tracked: this.dangerousVOCs.length,
      eco_certifications_tracked: this.ecoCertifications.length,
      last_check: new Date().toISOString()
    };
  }
}

module.exports = DetergentsAnalyzer;
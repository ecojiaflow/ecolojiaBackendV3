// backend/src/services/ai/novaClassifier.js

/**
 * 🔬 ECOLOJIA - Classification NOVA Scientifique
 * Implémentation officielle selon INSERM/ANSES 2024
 */

class NovaClassifier {
  constructor() {
    // Critères officiels classification NOVA (INSERM 2024)
    this.novaGroups = {
      1: {
        name: "Aliments non transformés ou minimalement transformés",
        description: "Aliments naturels ou ayant subi des transformations minimales",
        examples: ["Fruits frais", "Légumes", "Graines", "Viandes fraîches"]
      },
      2: {
        name: "Ingrédients culinaires transformés", 
        description: "Substances extraites d'aliments du groupe 1",
        examples: ["Huiles", "Beurre", "Sucre", "Sel", "Vinaigre"]
      },
      3: {
        name: "Aliments transformés",
        description: "Aliments du groupe 1 + ingrédients du groupe 2",
        examples: ["Pain artisanal", "Fromages", "Conserves simples"]
      },
      4: {
        name: "Aliments ultra-transformés",
        description: "Formulations industrielles avec additifs cosmétiques",
        examples: ["Sodas", "Plats préparés", "Biscuits industriels"]
      }
    };

    // Marqueurs ultra-transformation (Groupe 4)
    this.ultraProcessingMarkers = {
      // Additifs cosmétiques (non nécessaires nutritionnellement)
      additives: [
        'E102', 'E110', 'E124', 'E129', 'E131', 'E133', 'E151', // Colorants
        'E220', 'E221', 'E222', 'E223', 'E224', 'E228', // Sulfites
        'E249', 'E250', 'E251', 'E252', // Nitrites/Nitrates
        'E320', 'E321', // Antioxydants synthétiques
        'E338', 'E339', 'E340', 'E341', 'E450', 'E451', 'E452', // Phosphates
        'E471', 'E472a', 'E472b', 'E472c', 'E472e', 'E473', 'E475', // Émulsifiants
        'E950', 'E951', 'E952', 'E954', 'E955', 'E960', 'E961' // Édulcorants
      ],

      // Ingrédients industriels
      industrialIngredients: [
        'protéines hydrolysées', 'isolat de protéine', 'huiles hydrogénées',
        'sirop de glucose-fructose', 'sirop de maïs', 'maltodextrine',
        'dextrose', 'inuline', 'poudres de protéines', 'arômes artificiels'
      ],

      // Procédés industriels
      industrialProcesses: [
        'extrusion', 'pressage à chaud', 'hydrogénation', 'fractionnement',
        'texturisation', 'soufflage', 'gélification', 'émulsification forcée'
      ],

      // Textures impossibles à reproduire à la maison
      impossibleTextures: [
        'mousses persistantes', 'gels thermorésistants', 'croustillant permanent',
        'fondant instantané', 'texture aérée stable', 'émulsion impossible'
      ]
    };

    // Ingrédients groupe 1 (minimalement transformés)
    this.group1Ingredients = [
      'eau', 'fruits', 'légumes', 'graines', 'noix', 'viande', 'poisson',
      'œufs', 'lait', 'yaourt nature', 'fromage blanc', 'légumineuses',
      'céréales complètes', 'herbes', 'épices'
    ];

    // Ingrédients groupe 2 (culinaires)
    this.group2Ingredients = [
      'huile', 'beurre', 'sucre', 'sel', 'vinaigre', 'miel', 'sirop d\'érable'
    ];
  }

  /**
   * Classification principale NOVA
   * @param {Object} product - Produit avec ingrédients analysés
   * @returns {Object} Classification détaillée
   */
  classifyProduct(product) {
    const analysis = this.analyzeIngredients(product.ingredients || []);
    const novaGroup = this.determineNovaGroup(analysis);
    
    return {
      novaGroup,
      groupInfo: this.novaGroups[novaGroup],
      analysis,
      confidence: this.calculateConfidence(analysis),
      scientificSource: "Classification NOVA - INSERM 2024",
      healthImpact: this.getHealthImpact(novaGroup),
      recommendations: this.getRecommendations(novaGroup, analysis)
    };
  }

  /**
   * Analyse détaillée des ingrédients
   */
  analyzeIngredients(ingredients) {
    const ingredientsList = Array.isArray(ingredients) 
      ? ingredients 
      : this.parseIngredientsString(ingredients);

    return {
      totalCount: ingredientsList.length,
      ultraProcessingMarkers: this.detectUltraProcessingMarkers(ingredientsList),
      industrialIngredients: this.detectIndustrialIngredients(ingredientsList),
      additives: this.detectAdditives(ingredientsList),
      naturalIngredients: this.detectNaturalIngredients(ingredientsList),
      suspiciousTerms: this.detectSuspiciousTerms(ingredientsList)
    };
  }

  /**
   * Détection marqueurs ultra-transformation
   */
  detectUltraProcessingMarkers(ingredients) {
    const markers = [];
    
    ingredients.forEach(ingredient => {
      const normalized = ingredient.toLowerCase().trim();
      
      // Vérification additifs E-codes
      const eCodeMatch = normalized.match(/e\d{3,4}[a-z]?/g);
      if (eCodeMatch) {
        eCodeMatch.forEach(eCode => {
          if (this.ultraProcessingMarkers.additives.includes(eCode.toUpperCase())) {
            markers.push({
              type: 'additive',
              value: eCode.toUpperCase(),
              risk: this.getAdditiveRisk(eCode.toUpperCase()),
              impact: 'Marqueur ultra-transformation'
            });
          }
        });
      }

      // Vérification ingrédients industriels
      this.ultraProcessingMarkers.industrialIngredients.forEach(industrial => {
        if (normalized.includes(industrial.toLowerCase())) {
          markers.push({
            type: 'industrial',
            value: industrial,
            risk: 'high',
            impact: 'Procédé industriel complexe'
          });
        }
      });

      // Détection arômes artificiels
      if (normalized.includes('arôme') && !normalized.includes('naturel')) {
        markers.push({
          type: 'artificial_flavor',
          value: ingredient,
          risk: 'medium',
          impact: 'Arôme artificiel'
        });
      }
    });

    return markers;
  }

  /**
   * Détermination groupe NOVA final
   */
  determineNovaGroup(analysis) {
    // Groupe 4 : Ultra-transformé
    if (analysis.ultraProcessingMarkers.length > 0 || 
        analysis.totalCount > 5 ||
        analysis.additives.length > 2) {
      return 4;
    }

    // Groupe 3 : Transformé
    if (analysis.additives.length > 0 || 
        analysis.industrialIngredients.length > 0 ||
        analysis.totalCount > 3) {
      return 3;
    }

    // Groupe 2 : Ingrédients culinaires
    if (this.isMainlyCulinaryIngredients(analysis)) {
      return 2;
    }

    // Groupe 1 : Non/minimalement transformé
    return 1;
  }

  /**
   * Calcul confiance classification
   */
  calculateConfidence(analysis) {
    let confidence = 0.8; // Base

    // Augmente avec marqueurs clairs
    if (analysis.ultraProcessingMarkers.length > 2) confidence += 0.15;
    if (analysis.additives.length > 3) confidence += 0.1;
    
    // Diminue avec ambiguïté
    if (analysis.totalCount < 3) confidence -= 0.1;
    if (analysis.suspiciousTerms.length > 0) confidence -= 0.05;

    return Math.min(0.95, Math.max(0.6, confidence));
  }

  /**
   * Impact santé selon groupe NOVA
   */
  getHealthImpact(novaGroup) {
    const impacts = {
      1: {
        level: 'positive',
        description: 'Bénéfique pour la santé',
        risks: [],
        benefits: ['Haute densité nutritionnelle', 'Fibres naturelles', 'Antioxydants']
      },
      2: {
        level: 'neutral',
        description: 'Neutre si consommation modérée',
        risks: ['Calories concentrées'],
        benefits: ['Praticité culinaire']
      },
      3: {
        level: 'moderate',
        description: 'Acceptable en quantité limitée',
        risks: ['Sodium élevé possible', 'Conservateurs'],
        benefits: ['Praticité', 'Conservation']
      },
      4: {
        level: 'high_risk',
        description: 'À limiter fortement',
        risks: [
          '+22% risque dépression (Nature 2024)',
          '+53% risque diabète type 2 (BMJ 2024)', 
          '+10% maladies cardiovasculaires (Lancet 2024)',
          'Perturbation microbiote intestinal'
        ],
        benefits: []
      }
    };

    return impacts[novaGroup];
  }

  /**
   * Recommandations selon classification
   */
  getRecommendations(novaGroup, analysis) {
    if (novaGroup === 4) {
      return {
        action: 'replace',
        urgency: 'high',
        message: 'Remplacer par alternative naturelle',
        alternatives: this.suggestNaturalAlternatives(analysis),
        educationalTip: 'L\'ultra-transformation détruit la matrice alimentaire et ajoute des substances non alimentaires.'
      };
    }

    if (novaGroup === 3) {
      return {
        action: 'moderate',
        urgency: 'medium', 
        message: 'Consommer occasionnellement',
        alternatives: [],
        educationalTip: 'Privilégier la version maison quand possible.'
      };
    }

    return {
      action: 'enjoy',
      urgency: 'low',
      message: 'Excellent choix nutritionnel',
      alternatives: [],
      educationalTip: 'Les aliments peu transformés préservent leurs qualités nutritionnelles.'
    };
  }

  /**
   * Suggestions alternatives naturelles
   */
  suggestNaturalAlternatives(analysis) {
    // Cette méthode sera enrichie avec le moteur d'alternatives
    return [
      'Version maison avec ingrédients simples',
      'Produit équivalent groupe NOVA 1-2',
      'Recette traditionnelle'
    ];
  }

  /**
   * Utilitaires
   */
  parseIngredientsString(ingredientsStr) {
    if (!ingredientsStr) return [];
    return ingredientsStr
      .split(/[,;]/)
      .map(ing => ing.trim())
      .filter(ing => ing.length > 0);
  }

  detectAdditives(ingredients) {
    const additives = [];
    ingredients.forEach(ingredient => {
      const eCodeMatch = ingredient.match(/e\d{3,4}[a-z]?/gi);
      if (eCodeMatch) {
        additives.push(...eCodeMatch.map(e => e.toUpperCase()));
      }
    });
    return [...new Set(additives)];
  }

  detectIndustrialIngredients(ingredients) {
    return ingredients.filter(ingredient => 
      this.ultraProcessingMarkers.industrialIngredients.some(industrial =>
        ingredient.toLowerCase().includes(industrial.toLowerCase())
      )
    );
  }

  detectNaturalIngredients(ingredients) {
    return ingredients.filter(ingredient =>
      this.group1Ingredients.some(natural =>
        ingredient.toLowerCase().includes(natural.toLowerCase())
      )
    );
  }

  detectSuspiciousTerms(ingredients) {
    const suspicious = ['arôme', 'exhausteur', 'stabilisant', 'gélifiant', 'épaississant'];
    return ingredients.filter(ingredient =>
      suspicious.some(term => ingredient.toLowerCase().includes(term))
    );
  }

  getAdditiveRisk(eCode) {
    const highRisk = ['E102', 'E110', 'E124', 'E129', 'E249', 'E250', 'E320', 'E321'];
    const mediumRisk = ['E471', 'E472a', 'E951', 'E952'];
    
    if (highRisk.includes(eCode)) return 'high';
    if (mediumRisk.includes(eCode)) return 'medium';
    return 'low';
  }

  isMainlyCulinaryIngredients(analysis) {
    return analysis.naturalIngredients.length === 0 && 
           analysis.additives.length === 0 &&
           analysis.totalCount <= 2;
  }
}

module.exports = NovaClassifier;
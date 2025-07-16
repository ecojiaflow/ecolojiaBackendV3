// PATH: backend/src/services/ai/novaClassifier.ts

/**
 * 🔬 ECOLOJIA - Classification NOVA Scientifique
 * Implémentation officielle selon INSERM/ANSES 2024
 */

class NovaClassifier {
  novaGroups: any;
  ultraProcessingMarkers: any;
  group1Ingredients: string[];
  group2Ingredients: string[];

  constructor() {
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

    this.ultraProcessingMarkers = {
      additives: [
        'E102', 'E110', 'E124', 'E129', 'E131', 'E133', 'E150D', 'E151',
        'E220', 'E221', 'E222', 'E223', 'E224', 'E228',
        'E249', 'E250', 'E251', 'E252',
        'E320', 'E321',
        'E338', 'E339', 'E340', 'E341', 'E450', 'E451', 'E452',
        'E471', 'E472A', 'E472B', 'E472C', 'E472E', 'E473', 'E475',
        'E950', 'E951', 'E952', 'E954', 'E955', 'E960', 'E961'
      ],
      industrialIngredients: [
        'sirop de glucose-fructose', 'sirop glucose-fructose', 'glucose-fructose',
        'protéines hydrolysées', 'isolat de protéine', 'huiles hydrogénées',
        'sirop de maïs', 'maltodextrine', 'dextrose', 'inuline', 
        'poudres de protéines', 'arômes artificiels', 'huile de palme'
      ],
      industrialProcesses: [
        'extrusion', 'pressage à chaud', 'hydrogénation', 'fractionnement',
        'texturisation', 'soufflage', 'gélification', 'émulsification forcée'
      ],
      impossibleTextures: [
        'mousses persistantes', 'gels thermorésistants', 'croustillant permanent',
        'fondant instantané', 'texture aérée stable', 'émulsion impossible'
      ]
    };

    this.group1Ingredients = [
      'eau', 'fruits', 'légumes', 'graines', 'noix', 'viande', 'poisson',
      'œufs', 'lait', 'yaourt nature', 'fromage blanc', 'légumineuses',
      'céréales complètes', 'herbes', 'épices'
    ];

    this.group2Ingredients = [
      'huile', 'beurre', 'sucre', 'sel', 'vinaigre', 'miel', 'sirop d\'érable'
    ];
  }

  // ✅ MÉTHODE CLASSIFY (alias pour classifyProduct)
  async classify(product: { title: string; ingredients: string[] | string }) {
    return this.classifyProduct(product);
  }

  classifyProduct(product: { title?: string; ingredients: string[] | string }) {
    // ✅ CORRECTION: Parser correctement les ingrédients depuis title ET ingredients
    let ingredientsList: string[] = [];
    
    if (Array.isArray(product.ingredients)) {
      ingredientsList = product.ingredients;
    } else if (typeof product.ingredients === 'string' && product.ingredients.trim()) {
      ingredientsList = this.parseIngredientsString(product.ingredients);
    } else if (product.title) {
      // Parser les ingrédients depuis le titre du produit
      ingredientsList = this.parseIngredientsFromText(product.title);
    }

    console.log('🔍 Ingrédients détectés:', ingredientsList);

    const analysis = this.analyzeIngredients(ingredientsList);
    const novaGroup = this.determineNovaGroup(analysis);

    console.log('📊 Analyse:', analysis);
    console.log('⭐ Groupe NOVA:', novaGroup);

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

  // ✅ NOUVELLE MÉTHODE: Parser ingrédients depuis texte libre
  parseIngredientsFromText(text: string): string[] {
    if (!text) return [];
    
    // Détecter les patterns d'ingrédients dans le texte
    const ingredients: string[] = [];
    const normalizedText = text.toLowerCase();
    
    // Chercher les codes E
    const eCodes = text.match(/e\d{3,4}[a-z]?/gi);
    if (eCodes) {
      ingredients.push(...eCodes);
    }
    
    // Chercher les ingrédients industriels
    this.ultraProcessingMarkers.industrialIngredients.forEach(industrial => {
      if (normalizedText.includes(industrial.toLowerCase())) {
        ingredients.push(industrial);
      }
    });
    
    // Chercher d'autres termes suspects
    const suspiciousTerms = ['arôme', 'colorant', 'conservateur', 'émulsifiant', 'stabilisant'];
    suspiciousTerms.forEach(term => {
      if (normalizedText.includes(term)) {
        ingredients.push(term);
      }
    });
    
    return ingredients;
  }

  analyzeIngredients(ingredients: string[]) {
    console.log('🧪 Analyse des ingrédients:', ingredients);

    const analysis = {
      totalCount: ingredients.length,
      ultraProcessingMarkers: this.detectUltraProcessingMarkers(ingredients),
      industrialIngredients: this.detectIndustrialIngredients(ingredients),
      additives: this.detectAdditives(ingredients),
      naturalIngredients: this.detectNaturalIngredients(ingredients),
      suspiciousTerms: this.detectSuspiciousTerms(ingredients)
    };

    console.log('📋 Résultat analyse:', {
      additives: analysis.additives,
      industrialIngredients: analysis.industrialIngredients,
      ultraProcessingMarkers: analysis.ultraProcessingMarkers.length
    });

    return analysis;
  }

  detectUltraProcessingMarkers(ingredients: string[]) {
    const markers: any[] = [];

    ingredients.forEach(ingredient => {
      const normalized = ingredient.toLowerCase().trim();

      // Détecter codes E (amélioré)
      const eCodeMatch = ingredient.match(/e\d{3,4}[a-z]?/gi);
      if (eCodeMatch) {
        eCodeMatch.forEach(eCode => {
          const upperECode = eCode.toUpperCase();
          if (this.ultraProcessingMarkers.additives.includes(upperECode)) {
            markers.push({
              type: 'additive',
              value: upperECode,
              risk: this.getAdditiveRisk(upperECode),
              impact: 'Marqueur ultra-transformation'
            });
          }
        });
      }

      // Détecter ingrédients industriels
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

      // Détecter arômes artificiels
      if (normalized.includes('arôme') && !normalized.includes('naturel')) {
        markers.push({
          type: 'artificial_flavor',
          value: ingredient,
          risk: 'medium',
          impact: 'Arôme artificiel'
        });
      }
    });

    console.log('⚠️ Marqueurs ultra-transformation détectés:', markers);
    return markers;
  }

  determineNovaGroup(analysis: any) {
    console.log('🎯 Déterminant groupe NOVA avec:', {
      ultraProcessingMarkers: analysis.ultraProcessingMarkers.length,
      additives: analysis.additives.length,
      industrialIngredients: analysis.industrialIngredients.length
    });

    // ✅ CORRECTION: Logique plus stricte pour NOVA 4
    if (analysis.ultraProcessingMarkers.length > 0 || 
        analysis.additives.length > 0 || 
        analysis.industrialIngredients.length > 0) {
      return 4;
    }

    if (analysis.totalCount > 5) {
      return 3;
    }

    if (this.isMainlyCulinaryIngredients(analysis)) {
      return 2;
    }

    return 1;
  }

  calculateConfidence(analysis: any) {
    let confidence = 0.8;

    if (analysis.ultraProcessingMarkers.length > 2) confidence += 0.15;
    if (analysis.additives.length > 3) confidence += 0.1;

    if (analysis.totalCount < 3) confidence -= 0.1;
    if (analysis.suspiciousTerms.length > 0) confidence -= 0.05;

    return Math.min(0.95, Math.max(0.6, confidence));
  }

  getHealthImpact(novaGroup: number) {
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

    return impacts[novaGroup as keyof typeof impacts];
  }

  getRecommendations(novaGroup: number, analysis: any) {
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

  suggestNaturalAlternatives(_analysis: any) {
    return [
      'Version maison avec ingrédients simples',
      'Produit équivalent groupe NOVA 1-2',
      'Recette traditionnelle'
    ];
  }

  parseIngredientsString(ingredientsStr: string) {
    if (!ingredientsStr) return [];
    return ingredientsStr
      .split(/[,;]/)
      .map(ing => ing.trim())
      .filter(ing => ing.length > 0);
  }

  detectAdditives(ingredients: string[]) {
    const additives: string[] = [];
    ingredients.forEach(ingredient => {
      const eCodeMatch = ingredient.match(/e\d{3,4}[a-z]?/gi);
      if (eCodeMatch) {
        additives.push(...eCodeMatch.map(e => e.toUpperCase()));
      }
    });
    return [...new Set(additives)];
  }

  detectIndustrialIngredients(ingredients: string[]) {
    return ingredients.filter(ingredient =>
      this.ultraProcessingMarkers.industrialIngredients.some(industrial =>
        ingredient.toLowerCase().includes(industrial.toLowerCase())
      )
    );
  }

  detectNaturalIngredients(ingredients: string[]) {
    return ingredients.filter(ingredient =>
      this.group1Ingredients.some(natural =>
        ingredient.toLowerCase().includes(natural.toLowerCase())
      )
    );
  }

  detectSuspiciousTerms(ingredients: string[]) {
    const suspicious = ['arôme', 'exhausteur', 'stabilisant', 'gélifiant', 'épaississant'];
    return ingredients.filter(ingredient =>
      suspicious.some(term => ingredient.toLowerCase().includes(term))
    );
  }

  getAdditiveRisk(eCode: string) {
    const highRisk = ['E102', 'E110', 'E124', 'E129', 'E150D', 'E249', 'E250', 'E320', 'E321'];
    const mediumRisk = ['E471', 'E472A', 'E951', 'E952'];
    if (highRisk.includes(eCode)) return 'high';
    if (mediumRisk.includes(eCode)) return 'medium';
    return 'low';
  }

  isMainlyCulinaryIngredients(analysis: any) {
    return analysis.naturalIngredients.length === 0 &&
      analysis.additives.length === 0 &&
      analysis.totalCount <= 2;
  }
}

export default NovaClassifier;
// EOF
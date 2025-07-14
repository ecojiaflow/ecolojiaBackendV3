// backend/src/data/cosmeticsIngredients.js
// Base de données étendue ingrédients cosmétiques INCI

class CosmeticsIngredientsDatabase {
  constructor() {
    this.ingredients = this.initializeIngredientsDatabase();
    this.allergens = this.initializeAllergensDatabase();
    this.functions = this.initializeFunctionsDatabase();
  }

  initializeIngredientsDatabase() {
    return {
      // === SOLVANTS & BASES ===
      'aqua': {
        name: 'Aqua (Water)',
        function: 'Solvant',
        origin: 'natural',
        safety_score: 100,
        skin_compatibility: ['tous types'],
        concerns: [],
        benefits: ['Base universelle', 'Non irritant', 'Hydratant'],
        pregnancy_safe: true,
        vegan: true,
        halal: true
      },

      'glycerin': {
        name: 'Glycerin',
        function: 'Hydratant/Humectant',
        origin: 'natural_or_synthetic',
        safety_score: 95,
        skin_compatibility: ['tous types', 'peau sèche'],
        concerns: ['Peut être collant à forte concentration'],
        benefits: ['Hydratation intense', 'Non comédogène', 'Anti-âge'],
        pregnancy_safe: true,
        vegan: true,
        alternatives: ['Hyaluronic acid', 'Sodium hyaluronate']
      },

      'propylene glycol': {
        name: 'Propylene Glycol',
        function: 'Solvant/Hydratant',
        origin: 'synthetic',
        safety_score: 75,
        skin_compatibility: ['peau normale', 'peau grasse'],
        concerns: ['Irritation possible peau sensible', 'Sensibilisation'],
        benefits: ['Améliore pénétration', 'Texture agréable'],
        pregnancy_safe: true,
        alternatives: ['Butylene glycol', 'Pentylene glycol']
      },

      // === TENSIOACTIFS ===
      'sodium lauryl sulfate': {
        name: 'Sodium Lauryl Sulfate (SLS)',
        function: 'Tensioactif anionique',
        origin: 'synthetic',
        safety_score: 40,
        skin_compatibility: ['peau grasse'],
        concerns: ['Irritation cutanée forte', 'Dessèchement', 'Eczéma', 'Barrière cutanée altérée'],
        benefits: ['Mousse abondante', 'Nettoyage efficace', 'Économique'],
        pregnancy_safe: true,
        not_suitable_for: ['peau sensible', 'peau sèche', 'dermatite atopique'],
        alternatives: ['Coco glucoside', 'Decyl glucoside', 'Sodium cocoyl isethionate']
      },

      'sodium laureth sulfate': {
        name: 'Sodium Laureth Sulfate (SLES)',
        function: 'Tensioactif anionique',
        origin: 'synthetic',
        safety_score: 55,
        skin_compatibility: ['peau normale', 'peau grasse'],
        concerns: ['Irritation modérée', 'Possible contamination 1,4-dioxane'],
        benefits: ['Mousse crémeuse', 'Moins irritant que SLS'],
        pregnancy_safe: true,
        alternatives: ['Coco betaine', 'Sodium cocoyl glutamate']
      },

      'coco glucoside': {
        name: 'Coco Glucoside',
        function: 'Tensioactif non-ionique doux',
        origin: 'natural',
        safety_score: 90,
        skin_compatibility: ['tous types', 'peau sensible'],
        concerns: [],
        benefits: ['Très doux', 'Biodégradable', 'Non irritant', 'Origine végétale'],
        pregnancy_safe: true,
        vegan: true,
        certifications: ['Ecocert', 'Cosmos']
      },

      'cocamidopropyl betaine': {
        name: 'Cocamidopropyl Betaine',
        function: 'Tensioactif amphotère',
        origin: 'semi_synthetic',
        safety_score: 80,
        skin_compatibility: ['tous types'],
        concerns: ['Allergies rares', 'Impuretés possibles'],
        benefits: ['Doux', 'Conditionneur', 'Antistatique'],
        pregnancy_safe: true
      },

      // === CONSERVATEURS ===
      'paraben': {
        name: 'Parabens (famille)',
        function: 'Conservateur',
        origin: 'synthetic',
        safety_score: 45,
        skin_compatibility: ['peau normale'],
        concerns: ['Perturbateur endocrinien potentiel', 'Activité œstrogénique', 'Bioaccumulation'],
        benefits: ['Très efficace', 'Spectre large', 'Stable'],
        pregnancy_safe: false,
        endocrine_disruptor: true,
        alternatives: ['Phenoxyethanol', 'Benzyl alcohol', 'Potassium sorbate']
      },

      'methylparaben': {
        name: 'Methylparaben',
        function: 'Conservateur',
        origin: 'synthetic',
        safety_score: 50,
        skin_compatibility: ['peau normale'],
        concerns: ['Perturbateur endocrinien léger', 'Photosensibilisation'],
        benefits: ['Efficace champignons', 'Stable pH'],
        pregnancy_safe: false,
        concentration_limit: '0.4% EU',
        endocrine_disruptor: true
      },

      'phenoxyethanol': {
        name: 'Phenoxyethanol',
        function: 'Conservateur',
        origin: 'synthetic',
        safety_score: 75,
        skin_compatibility: ['tous types'],
        concerns: ['Irritation rare', 'Eczéma de contact possible'],
        benefits: ['Alternative parabens', 'Efficace', 'Bien toléré'],
        pregnancy_safe: true,
        concentration_limit: '1% EU'
      },

      'benzyl alcohol': {
        name: 'Benzyl Alcohol',
        function: 'Conservateur/Solvant',
        origin: 'natural_or_synthetic',
        safety_score: 80,
        skin_compatibility: ['tous types'],
        concerns: ['Allergène obligatoire >10ppm'],
        benefits: ['Naturellement présent', 'Doux', 'Multifonction'],
        pregnancy_safe: true,
        allergen_eu: true
      },

      // === PARFUMS & ALLERGÈNES ===
      'parfum': {
        name: 'Parfum/Fragrance',
        function: 'Parfum',
        origin: 'mixed',
        safety_score: 60,
        skin_compatibility: ['peau normale'],
        concerns: ['Allergènes cachés', 'Sensibilisation', 'Irritation'],
        benefits: ['Expérience sensorielle', 'Masque odeurs'],
        pregnancy_safe: true,
        allergen_potential: 'high',
        alternatives: ['Huiles essentielles', 'Parfum sans allergènes']
      },

      'limonene': {
        name: 'Limonene',
        function: 'Parfum naturel',
        origin: 'natural',
        safety_score: 65,
        skin_compatibility: ['peau normale'],
        concerns: ['Allergène obligatoire EU', 'Oxydation = irritation', 'Photosensibilisation'],
        benefits: ['Parfum agrumes naturel', 'Antioxydant léger'],
        pregnancy_safe: true,
        allergen_eu: true,
        prevalence_allergy: '2-3%'
      },

      'linalool': {
        name: 'Linalool',
        function: 'Parfum naturel',
        origin: 'natural',
        safety_score: 70,
        skin_compatibility: ['peau normale'],
        concerns: ['Allergène obligatoire EU', 'Sensibilisation contact'],
        benefits: ['Parfum floral naturel', 'Relaxant'],
        pregnancy_safe: true,
        allergen_eu: true,
        prevalence_allergy: '1-2%'
      },

      'citronellol': {
        name: 'Citronellol',
        function: 'Parfum naturel',
        origin: 'natural',
        safety_score: 68,
        skin_compatibility: ['peau normale'],
        concerns: ['Allergène obligatoire EU', 'Oxydation'],
        benefits: ['Parfum rosé naturel', 'Répulsif insectes'],
        pregnancy_safe: true,
        allergen_eu: true
      },

      'geraniol': {
        name: 'Geraniol',
        function: 'Parfum naturel',
        origin: 'natural',
        safety_score: 67,
        skin_compatibility: ['peau normale'],
        concerns: ['Allergène obligatoire EU', 'Irritation possible'],
        benefits: ['Parfum floral', 'Antimicrobien léger'],
        pregnancy_safe: true,
        allergen_eu: true
      },

      // === ÉMOLLIENTS & HUILES ===
      'dimethicone': {
        name: 'Dimethicone',
        function: 'Émollient silicone',
        origin: 'synthetic',
        safety_score: 75,
        skin_compatibility: ['tous types'],
        concerns: ['Non biodégradable', 'Accumulation environnement'],
        benefits: ['Protection barrière', 'Texture soyeuse', 'Non comédogène'],
        pregnancy_safe: true,
        environmental_impact: 'moderate'
      },

      'cyclopentasiloxane': {
        name: 'Cyclopentasiloxane',
        function: 'Émollient volatile',
        origin: 'synthetic',
        safety_score: 70,
        skin_compatibility: ['tous types'],
        concerns: ['Bioaccumulation potentielle', 'Perturbateur endocrinien suspecté'],
        benefits: ['Évaporation rapide', 'Texture légère'],
        pregnancy_safe: true,
        environmental_impact: 'high',
        alternatives: ['Squalane', 'Caprylic/Capric triglyceride']
      },

      'squalane': {
        name: 'Squalane',
        function: 'Émollient',
        origin: 'natural_or_synthetic',
        safety_score: 95,
        skin_compatibility: ['tous types', 'peau sensible'],
        concerns: [],
        benefits: ['Biomimétique', 'Anti-âge', 'Non comédogène', 'Stable'],
        pregnancy_safe: true,
        vegan: true,
        source: 'Olive, canne à sucre ou requin (éviter)'
      },

      'jojoba oil': {
        name: 'Simmondsia Chinensis (Jojoba) Seed Oil',
        function: 'Émollient/Huile',
        origin: 'natural',
        safety_score: 95,
        skin_compatibility: ['tous types'],
        concerns: [],
        benefits: ['97% similaire sébum humain', 'Régulatrice', 'Longue conservation'],
        pregnancy_safe: true,
        vegan: true,
        comedogenic_rating: 2
      },

      // === ACTIFS ANTI-ÂGE ===
      'retinol': {
        name: 'Retinol',
        function: 'Anti-âge/Rénovateur cellulaire',
        origin: 'synthetic',
        safety_score: 60,
        skin_compatibility: ['peau mature', 'peau acnéique'],
        concerns: ['Irritation', 'Photosensibilisation', 'Tératogène'],
        benefits: ['Anti-rides puissant', 'Stimule collagène', 'Unifie teint'],
        pregnancy_safe: false,
        breastfeeding_safe: false,
        usage_restrictions: 'Utilisation nocturne uniquement, SPF obligatoire'
      },

      'hyaluronic acid': {
        name: 'Hyaluronic Acid',
        function: 'Hydratant/Anti-âge',
        origin: 'biotechnology',
        safety_score: 95,
        skin_compatibility: ['tous types'],
        concerns: [],
        benefits: ['Hydratation intense', 'Repulpe', '1000x son poids en eau'],
        pregnancy_safe: true,
        vegan: true,
        molecular_weights: ['Bas poids: pénétration', 'Haut poids: film hydratant']
      },

      'niacinamide': {
        name: 'Niacinamide (Vitamin B3)',
        function: 'Régulateur/Anti-inflammatoire',
        origin: 'synthetic',
        safety_score: 90,
        skin_compatibility: ['tous types', 'peau sensible'],
        concerns: ['Flush possible >10%'],
        benefits: ['Régule sébum', 'Anti-inflammatoire', 'Éclaircit taches'],
        pregnancy_safe: true,
        optimal_concentration: '5-10%'
      },

      'vitamin c': {
        name: 'L-Ascorbic Acid (Vitamin C)',
        function: 'Antioxydant/Éclaircissant',
        origin: 'synthetic',
        safety_score: 85,
        skin_compatibility: ['tous types'],
        concerns: ['Instabilité', 'Irritation possible', 'Oxydation'],
        benefits: ['Antioxydant puissant', 'Stimule collagène', 'Éclaircit teint'],
        pregnancy_safe: true,
        stability_forms: ['Magnesium ascorbyl phosphate', 'Sodium ascorbyl phosphate']
      },

      // === INGRÉDIENTS PROBLÉMATIQUES ===
      'triclosan': {
        name: 'Triclosan',
        function: 'Antimicrobien',
        origin: 'synthetic',
        safety_score: 25,
        skin_compatibility: [],
        concerns: ['Perturbateur endocrinien majeur', 'Résistance bactérienne', 'Bioaccumulation'],
        benefits: ['Antimicrobien puissant'],
        pregnancy_safe: false,
        endocrine_disruptor: true,
        regulatory_status: 'Interdit savons EU 2016, limité cosmétiques',
        alternatives: ['Tea tree oil', 'Alcohol', 'Benzoic acid']
      },

      'hydroquinone': {
        name: 'Hydroquinone',
        function: 'Dépigmentant',
        origin: 'synthetic',
        safety_score: 30,
        skin_compatibility: [],
        concerns: ['Cancérogène potentiel', 'Ochronose', 'Absorption systémique'],
        benefits: ['Dépigmentant efficace'],
        pregnancy_safe: false,
        regulatory_status: 'Interdit cosmétiques EU, limité 2% médicaments',
        alternatives: ['Kojic acid', 'Arbutin', 'Vitamin C']
      },

      'formaldehyde': {
        name: 'Formaldehyde',
        function: 'Conservateur',
        origin: 'synthetic',
        safety_score: 15,
        skin_compatibility: [],
        concerns: ['Cancérogène groupe 1 IARC', 'Irritation sévère', 'Sensibilisation'],
        benefits: ['Conservateur efficace'],
        pregnancy_safe: false,
        regulatory_status: 'Interdit cosmétiques EU',
        hidden_sources: ['DMDM hydantoin', 'Imidazolidinyl urea', 'Quaternium-15']
      }
    };
  }

  initializeAllergensDatabase() {
    // 26 allergènes obligatoires EU + extensions
    return {
      'mandatory_eu': [
        'limonene', 'linalool', 'benzyl alcohol', 'citronellol', 'geraniol',
        'eugenol', 'cinnamal', 'benzyl salicylate', 'alpha-isomethyl ionone',
        'coumarin', 'benzyl benzoate', 'farnesol', 'hexyl cinnamal',
        'citral', 'anise alcohol', 'benzyl cinnamate', 'isoeugenol',
        'hydroxycitronellal', 'hydroxyisohexyl 3-cyclohexene carboxaldehyde',
        'amyl cinnamal', 'butylphenyl methylpropional', 'cinnamyl alcohol',
        'citronellol', 'evernia furfuracea extract', 'evernia prunastri extract',
        'methyl 2-octynoate'
      ],
      'preservatives': [
        'methylisothiazolinone', 'chloromethylisothiazolinone', 
        'methylchloroisothiazolinone', 'formaldehyde', 'kathon cg'
      ],
      'contact_allergens': [
        'nickel', 'chromium', 'cobalt', 'fragrance mix', 'balsam of peru'
      ]
    };
  }

  initializeFunctionsDatabase() {
    return {
      'solvant': 'Dissout autres ingrédients, base formulation',
      'tensioactif': 'Nettoyage, mousse, émulsification',
      'émollient': 'Adoucit, protège, texture',
      'hydratant': 'Retient eau dans peau',
      'conservateur': 'Empêche développement microbien',
      'parfum': 'Expérience sensorielle olfactive',
      'colorant': 'Coloration produit ou peau',
      'épaississant': 'Modifie viscosité, texture',
      'antioxydant': 'Prévient oxydation, anti-âge',
      'exfoliant': 'Élimine cellules mortes',
      'protection_solaire': 'Filtre UV, photoprotection',
      'régulateur_ph': 'Ajuste acidité formulation',
      'actif': 'Bénéfice ciblé peau (anti-âge, etc.)'
    };
  }

  // === MÉTHODES DE RECHERCHE ===
  getIngredient(inci_name) {
    const normalizedName = inci_name.toLowerCase().trim();
    return this.ingredients[normalizedName] || null;
  }

  searchByFunction(function_name) {
    return Object.entries(this.ingredients)
      .filter(([key, ingredient]) => 
        ingredient.function.toLowerCase().includes(function_name.toLowerCase())
      )
      .map(([key, ingredient]) => ({ inci: key, ...ingredient }));
  }

  searchSafeAlternatives(unsafe_ingredient, min_safety_score = 80) {
    const ingredient = this.getIngredient(unsafe_ingredient);
    if (!ingredient) return [];

    return Object.entries(this.ingredients)
      .filter(([key, ing]) => 
        ing.function === ingredient.function && 
        ing.safety_score >= min_safety_score
      )
      .map(([key, ing]) => ({ inci: key, ...ing }))
      .sort((a, b) => b.safety_score - a.safety_score);
  }

  getPregnancySafeAlternatives(ingredient_name) {
    const ingredient = this.getIngredient(ingredient_name);
    if (!ingredient) return [];

    return Object.entries(this.ingredients)
      .filter(([key, ing]) => 
        ing.function === ingredient.function && 
        ing.pregnancy_safe === true
      )
      .map(([key, ing]) => ({ inci: key, ...ing }));
  }

  getAllergens() {
    return this.allergens;
  }

  checkAllergen(ingredient_name) {
    const normalized = ingredient_name.toLowerCase();
    
    for (const [category, allergens] of Object.entries(this.allergens)) {
      if (allergens.includes(normalized)) {
        return {
          is_allergen: true,
          category,
          mandatory_declaration: category === 'mandatory_eu'
        };
      }
    }
    
    return { is_allergen: false };
  }

  getEndocrineDisruptors() {
    return Object.entries(this.ingredients)
      .filter(([key, ingredient]) => ingredient.endocrine_disruptor === true)
      .map(([key, ingredient]) => ({ inci: key, ...ingredient }));
  }

  // === ANALYSES SPÉCIALISÉES ===
  analyzeIngredientSafety(ingredients_list) {
    const analysis = {
      total_ingredients: ingredients_list.length,
      safe_count: 0,
      concerning_count: 0,
      unknown_count: 0,
      allergens_detected: [],
      endocrine_disruptors: [],
      pregnancy_unsafe: [],
      overall_safety_score: 0
    };

    let totalSafetyScore = 0;

    for (const ingredient of ingredients_list) {
      const ingredientData = this.getIngredient(ingredient);
      
      if (ingredientData) {
        totalSafetyScore += ingredientData.safety_score;
        
        if (ingredientData.safety_score >= 80) {
          analysis.safe_count++;
        } else if (ingredientData.safety_score < 60) {
          analysis.concerning_count++;
        }

        // Vérification allergènes
        const allergenCheck = this.checkAllergen(ingredient);
        if (allergenCheck.is_allergen) {
          analysis.allergens_detected.push({
            ingredient,
            category: allergenCheck.category,
            mandatory: allergenCheck.mandatory_declaration
          });
        }

        // Vérification perturbateurs endocriniens
        if (ingredientData.endocrine_disruptor) {
          analysis.endocrine_disruptors.push(ingredient);
        }

        // Vérification sécurité grossesse
        if (ingredientData.pregnancy_safe === false) {
          analysis.pregnancy_unsafe.push(ingredient);
        }
      } else {
        analysis.unknown_count++;
        totalSafetyScore += 50; // Score neutre pour ingrédients inconnus
      }
    }

    analysis.overall_safety_score = Math.round(totalSafetyScore / ingredients_list.length);
    return analysis;
  }

  generateSafetyReport(ingredients_list) {
    const analysis = this.analyzeIngredientSafety(ingredients_list);
    
    return {
      ...analysis,
      recommendations: this.generateRecommendations(analysis),
      risk_level: this.assessRiskLevel(analysis),
      suitable_for: this.assessSuitability(ingredients_list)
    };
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.allergens_detected.length > 0) {
      recommendations.push('Test cutané recommandé - allergènes détectés');
    }

    if (analysis.endocrine_disruptors.length > 0) {
      recommendations.push('Éviter pendant grossesse/allaitement - perturbateurs endocriniens');
    }

    if (analysis.concerning_count > analysis.total_ingredients * 0.3) {
      recommendations.push('Considérer alternative plus sûre - nombreux ingrédients préoccupants');
    }

    if (analysis.overall_safety_score < 60) {
      recommendations.push('Produit à éviter - score sécurité faible');
    }

    return recommendations;
  }

  assessRiskLevel(analysis) {
    if (analysis.overall_safety_score >= 80 && analysis.endocrine_disruptors.length === 0) {
      return 'low';
    } else if (analysis.overall_safety_score >= 60 && analysis.endocrine_disruptors.length <= 1) {
      return 'moderate';
    } else {
      return 'high';
    }
  }

  assessSuitability(ingredients_list) {
    const suitability = {
      sensitive_skin: true,
      pregnancy: true,
      children: true,
      eczema_prone: true
    };

    for (const ingredient of ingredients_list) {
      const ingredientData = this.getIngredient(ingredient);
      if (ingredientData) {
        if (ingredientData.not_suitable_for?.includes('peau sensible')) {
          suitability.sensitive_skin = false;
        }
        if (ingredientData.pregnancy_safe === false) {
          suitability.pregnancy = false;
        }
        if (ingredientData.concerns?.some(c => c.includes('irritation'))) {
          suitability.children = false;
          suitability.eczema_prone = false;
        }
      }
    }

    return suitability;
  }

  // === STATISTIQUES ===
  getStatistics() {
    const totalIngredients = Object.keys(this.ingredients).length;
    const safeIngredients = Object.values(this.ingredients).filter(i => i.safety_score >= 80).length;
    const naturalIngredients = Object.values(this.ingredients).filter(i => i.origin === 'natural').length;
    const pregnancySafe = Object.values(this.ingredients).filter(i => i.pregnancy_safe === true).length;

    return {
      total_ingredients: totalIngredients,
      safe_ingredients: safeIngredients,
      safe_percentage: Math.round((safeIngredients / totalIngredients) * 100),
      natural_ingredients: naturalIngredients,
      natural_percentage: Math.round((naturalIngredients / totalIngredients) * 100),
      pregnancy_safe: pregnancySafe,
      pregnancy_safe_percentage: Math.round((pregnancySafe / totalIngredients) * 100),
      total_allergens: this.allergens.mandatory_eu.length
    };
  }
}

// Export singleton
module.exports = new CosmeticsIngredientsDatabase();
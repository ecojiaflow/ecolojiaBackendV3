const fs = require('fs').promises;
const path = require('path');

class AlternativesEngine {
  constructor() {
    this.alternativesDB = null;
    this.loadDatabase();
  }

  async loadDatabase() {
    try {
      const dbPath = path.join(__dirname, '../../data/natural-alternatives-db.json');
      const data = await fs.readFile(dbPath, 'utf8');
      this.alternativesDB = JSON.parse(data);
      console.log('✅ Alternatives database loaded successfully');
    } catch (error) {
      console.error('❌ Error loading alternatives database:', error);
      this.alternativesDB = { alimentaire: {}, cosmetiques: {}, menage: [] };
    }
  }

  /**
   * Trouve des alternatives naturelles pour un produit donné
   * @param {Object} productData - Données du produit analysé
   * @param {Object} userProfile - Profil utilisateur (optionnel)
   * @returns {Array} Liste des alternatives recommandées
   */
  async findAlternatives(productData, userProfile = {}) {
    if (!this.alternativesDB) {
      await this.loadDatabase();
    }

    const alternatives = [];
    
    // Déterminer la catégorie du produit
    const category = this.categorizeProduct(productData);
    
    // Rechercher alternatives spécifiques à la catégorie
    const categoryAlternatives = this.getCategoryAlternatives(category, productData);
    alternatives.push(...categoryAlternatives);

    // Ajouter alternatives génériques basées sur les problèmes détectés
    const problemBasedAlternatives = this.getProblemBasedAlternatives(productData);
    alternatives.push(...problemBasedAlternatives);

    // Personnaliser selon le profil utilisateur
    const personalizedAlternatives = this.personalizeAlternatives(alternatives, userProfile);

    // Trier par pertinence et qualité
    const sortedAlternatives = this.sortAlternativesByRelevance(personalizedAlternatives, productData);

    // Limiter à 4 meilleures alternatives max pour éviter choice overload
    return sortedAlternatives.slice(0, 4);
  }

  /**
   * Catégorise automatiquement un produit
   */
  categorizeProduct(productData) {
    const productName = (productData.name || '').toLowerCase();
    const ingredients = (productData.ingredients || []).join(' ').toLowerCase();
    const text = `${productName} ${ingredients}`;

    // Patterns de reconnaissance
    const patterns = {
      'cereales_petit_dejeuner': /céréales|muesli|granola|flocons|avoine|corn.?flakes/,
      'yaourts': /yaourt|yogurt|skyr|fromage blanc/,
      'laits_vegetaux': /lait.*(?:avoine|amande|soja|coco|riz)/,
      'snacks_sucres': /biscuit|cookie|gâteau|barr.*céréales|chocolat/,
      'plats_cuisines': /plat.*cuisiné|ravioli|pizza|lasagne|ready.*meal/,
      'boissons': /jus|soda|boisson|drink|eau.*aromatisé/,
      'soins_visage': /crème|sérum|lotion|gel.*visage|anti.*âge/,
      'soins_cheveux': /shampooing|après.*shampooing|masque.*cheveux|conditioner/,
      'hygiene': /déodorant|dentifrice|gel.*douche|savon/,
      'nettoyants_multiusages': /nettoyant|détergent|liquide.*vaisselle|spray/,
      'lessive': /lessive|adoucissant|fabric.*softener/
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Récupère les alternatives spécifiques à une catégorie
   */
  getCategoryAlternatives(category, productData) {
    const alternatives = [];

    // Navigation dans la base de données par catégorie
    const categoryPath = this.getCategoryPath(category);
    let dbSection = this.alternativesDB;

    // Naviguer dans l'arborescence de la DB
    for (const pathPart of categoryPath) {
      if (dbSection && dbSection[pathPart]) {
        dbSection = dbSection[pathPart];
      } else {
        dbSection = null;
        break;
      }
    }

    if (dbSection && Array.isArray(dbSection)) {
      // Si c'est un array d'alternatives directes
      alternatives.push(...dbSection.map(alt => ({
        ...alt,
        relevance_score: this.calculateRelevanceScore(alt, productData),
        type: 'category_specific'
      })));
    } else if (dbSection && typeof dbSection === 'object') {
      // Si c'est un objet avec sous-catégories, prendre toutes les alternatives
      Object.values(dbSection).forEach(subCategory => {
        if (Array.isArray(subCategory)) {
          alternatives.push(...subCategory.map(alt => ({
            ...alt,
            relevance_score: this.calculateRelevanceScore(alt, productData),
            type: 'category_specific'
          })));
        }
      });
    }

    return alternatives;
  }

  /**
   * Mappe les catégories vers les chemins dans la DB
   */
  getCategoryPath(category) {
    const mappings = {
      'cereales_petit_dejeuner': ['alimentaire', 'cereales_petit_dejeuner'],
      'yaourts': ['alimentaire', 'produits_laitiers', 'yaourts'],
      'laits_vegetaux': ['alimentaire', 'produits_laitiers', 'laits_vegetaux'],
      'snacks_sucres': ['alimentaire', 'snacks_sucres'],
      'plats_cuisines': ['alimentaire', 'plats_cuisines'],
      'boissons': ['alimentaire', 'boissons'],
      'soins_visage': ['cosmetiques', 'soins_visage'],
      'soins_cheveux': ['cosmetiques', 'soins_cheveux'],
      'hygiene': ['cosmetiques', 'hygiene'],
      'nettoyants_multiusages': ['menage', 'nettoyants_multiusages'],
      'lessive': ['menage', 'lessive']
    };

    return mappings[category] || ['general'];
  }

  /**
   * Trouve des alternatives basées sur les problèmes détectés
   */
  getProblemBasedAlternatives(productData) {
    const alternatives = [];
    const issues = this.detectIssues(productData);

    issues.forEach(issue => {
      const problemAlternatives = this.getAlternativesForIssue(issue, productData);
      alternatives.push(...problemAlternatives);
    });

    return alternatives;
  }

  /**
   * Détecte les problèmes dans un produit
   */
  detectIssues(productData) {
    const issues = [];

    // NOVA 4 = ultra-transformé
    if (productData.breakdown?.transformation?.novaGroup === 4) {
      issues.push('ultra_processed');
    }

    // Additifs problématiques
    const problematicAdditives = ['E471', 'E472', 'E249', 'E250', 'E621'];
    const productAdditives = productData.ingredients || [];
    const hasProblematicAdditives = productAdditives.some(ing => 
      problematicAdditives.some(additive => ing.includes(additive))
    );
    if (hasProblematicAdditives) {
      issues.push('problematic_additives');
    }

    // Index glycémique élevé
    if (productData.breakdown?.glycemic?.estimatedGI > 70) {
      issues.push('high_glycemic');
    }

    // Nutri-Score médiocre
    if (['D', 'E'].includes(productData.breakdown?.nutrition?.nutriScore?.grade)) {
      issues.push('poor_nutriscore');
    }

    // Trop d'ingrédients (>10 = suspect)
    if (productData.ingredients && productData.ingredients.length > 10) {
      issues.push('too_many_ingredients');
    }

    return issues;
  }

  /**
   * Alternatives pour un problème spécifique
   */
  getAlternativesForIssue(issue, productData) {
    const issueAlternatives = {
      'ultra_processed': [
        {
          name: "Version fait maison",
          why_better: "Contrôle total ingrédients, zéro additifs, fraîcheur maximale",
          difficulty: "moyen",
          time: "15-30min",
          cost_comparison: "-40% en moyenne",
          nutritional_advantage: "Nutriments préservés, pas d'ultra-transformation",
          environmental_benefit: "Emballage minimal, ingrédients locaux possibles",
          sources: ["INSERM NOVA Classification 2024"],
          type: 'diy'
        }
      ],
      'problematic_additives': [
        {
          name: "Alternative sans additifs",
          why_better: "Zéro émulsifiants, conservateurs naturels uniquement",
          difficulty: "facile",
          time: "Même temps préparation",
          cost_comparison: "Prix équivalent",
          nutritional_advantage: "Microbiote préservé, pas de perturbation intestinale",
          environmental_benefit: "Moins de chimie industrielle",
          sources: ["EFSA 2024 - Additives Assessment"],
          type: 'substitute'
        }
      ],
      'high_glycemic': [
        {
          name: "Version à index glycémique bas",
          why_better: "Régulation glycémique, pas de pic d'insuline",
          difficulty: "facile",
          time: "Même temps",
          cost_comparison: "Prix similaire",
          nutritional_advantage: "Énergie stable, satiété prolongée",
          environmental_benefit: "Souvent moins transformé",
          sources: ["International Glycemic Index Database 2024"],
          type: 'substitute'
        }
      ],
      'poor_nutriscore': [
        {
          name: "Alternative Nutri-Score A ou B",
          why_better: "Meilleur profil nutritionnel global",
          difficulty: "facile",
          time: "Aucune différence",
          cost_comparison: "Prix compétitif",
          nutritional_advantage: "Plus de nutriments, moins de sel/sucre/graisses saturées",
          environmental_benefit: "Souvent meilleure qualité = moins d'impact",
          sources: ["ANSES Nutri-Score Algorithm 2024"],
          type: 'substitute'
        }
      ],
      'too_many_ingredients': [
        {
          name: "Produit à ingrédients simples (<5)",
          why_better: "Transparence totale, pas d'additifs cachés",
          difficulty: "facile",
          time: "Aucune différence",
          cost_comparison: "Souvent moins cher",
          nutritional_advantage: "Ingrédients reconnaissables, pas de synergies négatives",
          environmental_benefit: "Chaîne d'approvisionnement simplifiée",
          sources: ["Clean Label Research 2024"],
          type: 'substitute'
        }
      ]
    };

    return (issueAlternatives[issue] || []).map(alt => ({
      ...alt,
      relevance_score: this.calculateIssueRelevanceScore(alt, issue, productData),
      detected_issue: issue
    }));
  }

  /**
   * Personnalise les alternatives selon le profil utilisateur
   */
  personalizeAlternatives(alternatives, userProfile) {
    return alternatives.map(alt => {
      let personalizedAlt = { ...alt };

      // Ajuster selon les contraintes utilisateur
      if (userProfile.allergies) {
        personalizedAlt.allergy_warning = this.checkAllergies(alt, userProfile.allergies);
      }

      if (userProfile.budget_conscious) {
        personalizedAlt.budget_impact = this.calculateBudgetImpact(alt);
      }

      if (userProfile.time_constrained) {
        personalizedAlt.time_efficiency = this.calculateTimeEfficiency(alt);
      }

      if (userProfile.environmental_priority) {
        personalizedAlt.eco_score = this.calculateEcoScore(alt);
      }

      return personalizedAlt;
    });
  }

  /**
   * Calcule un score de pertinence pour une alternative
   */
  calculateRelevanceScore(alternative, productData) {
    let score = 0;

    // Bonus pour alternatives avec preuves scientifiques
    if (alternative.sources && alternative.sources.length > 0) {
      score += 30;
    }

    // Bonus pour facilité d'implémentation
    const difficultyScores = { 'facile': 25, 'moyen': 15, 'avancé': 5 };
    score += difficultyScores[alternative.difficulty] || 0;

    // Bonus pour économies de coût
    if (alternative.cost_comparison && alternative.cost_comparison.includes('-')) {
      score += 20;
    }

    // Bonus pour avantages nutritionnels chiffrés
    if (alternative.why_better && /\+\d+%/.test(alternative.why_better)) {
      score += 15;
    }

    // Bonus pour temps de préparation court
    if (alternative.time && parseInt(alternative.time) <= 5) {
      score += 10;
    }

    return score;
  }

  /**
   * Calcule score de pertinence pour alternatives basées sur problèmes
   */
  calculateIssueRelevanceScore(alternative, issue, productData) {
    let baseScore = this.calculateRelevanceScore(alternative, productData);
    
    // Bonus selon criticité du problème
    const issuePriority = {
      'ultra_processed': 40,
      'problematic_additives': 35,
      'high_glycemic': 30,
      'poor_nutriscore': 25,
      'too_many_ingredients': 20
    };

    return baseScore + (issuePriority[issue] || 0);
  }

  /**
   * Trie les alternatives par pertinence
   */
  sortAlternativesByRelevance(alternatives, productData) {
    return alternatives.sort((a, b) => {
      // Trier par score de pertinence décroissant
      const scoreA = a.relevance_score || 0;
      const scoreB = b.relevance_score || 0;
      
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      // Si scores égaux, privilégier alternatives spécifiques à la catégorie
      if (a.type === 'category_specific' && b.type !== 'category_specific') {
        return -1;
      }
      if (b.type === 'category_specific' && a.type !== 'category_specific') {
        return 1;
      }

      // Si toujours égal, privilégier facilité
      const difficultyOrder = { 'facile': 0, 'moyen': 1, 'avancé': 2 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
  }

  /**
   * Vérifie les allergies pour une alternative
   */
  checkAllergies(alternative, allergies) {
    const warnings = [];
    const ingredients = (alternative.ingredients || []).join(' ').toLowerCase();
    
    allergies.forEach(allergy => {
      if (ingredients.includes(allergy.toLowerCase())) {
        warnings.push(`⚠️ Contient ${allergy}`);
      }
    });

    return warnings.length > 0 ? warnings : null;
  }

  /**
   * Calcule l'impact budgétaire
   */
  calculateBudgetImpact(alternative) {
    const costComparison = alternative.cost_comparison || '';
    const match = costComparison.match(/-(\d+)%/);
    
    if (match) {
      const savings = parseInt(match[1]);
      if (savings >= 50) return 'Économies importantes';
      if (savings >= 25) return 'Économies modérées';
      if (savings >= 10) return 'Petites économies';
    }
    
    return 'Impact neutre';
  }

  /**
   * Calcule l'efficacité temporelle
   */
  calculateTimeEfficiency(alternative) {
    const timeStr = alternative.time || '';
    const minutes = parseInt(timeStr);
    
    if (minutes <= 2) return 'Très rapide';
    if (minutes <= 10) return 'Rapide';
    if (minutes <= 30) return 'Modéré';
    return 'Prend du temps';
  }

  /**
   * Calcule un score écologique simplifié
   */
  calculateEcoScore(alternative) {
    let score = 0;
    
    const benefits = alternative.environmental_benefit || '';
    
    if (benefits.includes('local')) score += 20;
    if (benefits.includes('emballage')) score += 15;
    if (benefits.includes('transport')) score += 15;
    if (benefits.includes('biodégradable')) score += 10;
    if (benefits.includes('zéro déchet')) score += 25;
    
    if (score >= 40) return 'Excellent';
    if (score >= 25) return 'Très bon';
    if (score >= 15) return 'Bon';
    return 'Modéré';
  }

  /**
   * Génère une explication pourquoi cette alternative est meilleure
   */
  generateWhyBetterExplanation(alternative, productData) {
    const explanations = [];
    
    // Transformation
    if (productData.breakdown?.transformation?.novaGroup === 4) {
      explanations.push("Évite l'ultra-transformation qui détruit la matrice alimentaire");
    }
    
    // Additifs
    const hasAdditives = productData.ingredients?.some(ing => ing.startsWith('E'));
    if (hasAdditives) {
      explanations.push("Supprime les additifs qui perturbent le microbiote");
    }
    
    // Index glycémique
    if (productData.breakdown?.glycemic?.estimatedGI > 70) {
      explanations.push("Réduit l'index glycémique pour une énergie stable");
    }
    
    // Avantages spécifiques de l'alternative
    if (alternative.nutritional_advantage) {
      explanations.push(alternative.nutritional_advantage);
    }
    
    return explanations.join('. ') + '.';
  }

  /**
   * API publique : obtenir alternatives pour un produit
   */
  async getAlternativesForProduct(productData, userProfile = {}) {
    try {
      const alternatives = await this.findAlternatives(productData, userProfile);
      
      return alternatives.map(alt => ({
        name: alt.name,
        why_better: this.generateWhyBetterExplanation(alt, productData),
        difficulty: alt.difficulty,
        time: alt.time,
        cost_impact: alt.cost_comparison,
        sources: alt.sources || [],
        type: alt.type || 'general',
        recipe_link: alt.recipe_link || alt.usage_guide,
        environmental_benefit: alt.environmental_benefit,
        confidence: alt.sources && alt.sources.length > 0 ? 'high' : 'medium'
      }));
    } catch (error) {
      console.error('Error finding alternatives:', error);
      return [];
    }
  }
}

module.exports = new AlternativesEngine();
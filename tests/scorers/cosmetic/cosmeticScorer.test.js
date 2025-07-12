/**
 * Tests Jest pour cosmeticScorer.js
 * Fichier : backend/tests/services/cosmeticScorer.test.js
 */

const CosmeticScorer = require('../../src/services/scoring/cosmeticScorer');

describe('CosmeticScorer', () => {
  let cosmeticScorer;

  beforeEach(() => {
    cosmeticScorer = new CosmeticScorer();
  });

  describe('Extraction des ingrédients INCI', () => {
    test('Doit extraire correctement les ingrédients depuis une liste', () => {
      const productData = {
        ingredients: "AQUA, GLYCERIN, CETYL ALCOHOL, DIMETHICONE, BUTYLPARABEN"
      };
      
      const ingredients = cosmeticScorer.extractInciIngredients(productData);
      
      expect(ingredients).toContain('AQUA');
      expect(ingredients).toContain('GLYCERIN');
      expect(ingredients).toContain('BUTYLPARABEN');
      expect(ingredients).toHaveLength(5);
    });

    test('Doit nettoyer et normaliser les ingrédients', () => {
      const productData = {
        ingredients: "ingredients: Aqua (eau), Glycerin (10%), Cetyl Alcohol"
      };
      
      const ingredients = cosmeticScorer.extractInciIngredients(productData);
      
      expect(ingredients).toContain('AQUA');
      expect(ingredients).toContain('GLYCERIN');
      expect(ingredients).toContain('CETYL ALCOHOL');
      expect(ingredients).not.toContain('INGREDIENTS:');
      expect(ingredients).not.toContain('10%');
    });

    test('Doit gérer les sources alternatives (composition, inci)', () => {
      const productData = {
        composition: "AQUA, NIACINAMIDE, HYALURONIC ACID"
      };
      
      const ingredients = cosmeticScorer.extractInciIngredients(productData);
      
      expect(ingredients).toContain('AQUA');
      expect(ingredients).toContain('NIACINAMIDE');
      expect(ingredients).toContain('HYALURONIC ACID');
    });
  });

  describe('Analyse des risques', () => {
    test('Doit détecter les perturbateurs endocriniens', () => {
      const ingredients = ['AQUA', 'BUTYLPARABEN', 'BENZOPHENONE-3', 'GLYCERIN'];
      
      const riskAnalysis = cosmeticScorer.analyzeRisks(ingredients);
      
      expect(riskAnalysis.endocrine_disruptors).toHaveLength(2);
      expect(riskAnalysis.endocrine_disruptors[0].name).toBe('BUTYLPARABEN');
      expect(riskAnalysis.endocrine_disruptors[1].name).toBe('BENZOPHENONE-3');
      expect(riskAnalysis.overall_risk).toBe('high');
    });

    test('Doit calculer un score de risque approprié', () => {
      const safeIngredients = ['AQUA', 'GLYCERIN', 'TOCOPHEROL'];
      const riskyIngredients = ['BUTYLPARABEN', 'TRICLOSAN', 'BHA'];
      
      const safeAnalysis = cosmeticScorer.analyzeRisks(safeIngredients);
      const riskyAnalysis = cosmeticScorer.analyzeRisks(riskyIngredients);
      
      expect(safeAnalysis.risk_score).toBeGreaterThan(riskyAnalysis.risk_score);
      expect(safeAnalysis.overall_risk).toBe('low');
      expect(riskyAnalysis.overall_risk).toBe('high');
    });

    test('Doit identifier les ingrédients pour peau sensible', () => {
      const ingredients = ['AQUA', 'PARFUM', 'SODIUM LAURYL SULFATE'];
      
      const riskAnalysis = cosmeticScorer.analyzeRisks(ingredients);
      
      expect(riskAnalysis.toxic_ingredients).toHaveLength(2);
      expect(riskAnalysis.toxic_ingredients.some(ing => ing.name === 'PARFUM')).toBe(true);
    });
  });

  describe('Analyse des bénéfices', () => {
    test('Doit identifier les ingrédients actifs bénéfiques', () => {
      const ingredients = ['AQUA', 'HYALURONIC ACID', 'NIACINAMIDE', 'RETINOL'];
      
      const benefitAnalysis = cosmeticScorer.analyzeBenefits(ingredients);
      
      expect(benefitAnalysis.active_ingredients).toHaveLength(3);
      expect(benefitAnalysis.active_ingredients.some(ing => ing.name === 'HYALURONIC ACID')).toBe(true);
      expect(benefitAnalysis.efficacy_score).toBeGreaterThan(0);
    });

    test('Doit regrouper par catégories de bénéfices', () => {
      const ingredients = ['HYALURONIC ACID', 'GLYCERIN', 'RETINOL', 'ASCORBIC ACID'];
      
      const benefitAnalysis = cosmeticScorer.analyzeBenefits(ingredients);
      
      const hydrationCategory = benefitAnalysis.skincare_benefits.find(cat => cat.category === 'Hydratation');
      const antiAgeCategory = benefitAnalysis.skincare_benefits.find(cat => cat.category === 'Anti-âge');
      
      expect(hydrationCategory).toBeDefined();
      expect(hydrationCategory.ingredients).toContain('HYALURONIC ACID');
      expect(antiAgeCategory).toBeDefined();
      expect(antiAgeCategory.ingredients).toContain('RETINOL');
    });
  });

  describe('Analyse des allergènes', () => {
    test('Doit détecter les allergènes connus', () => {
      const ingredients = ['AQUA', 'LIMONENE', 'LINALOOL', 'EUGENOL'];
      
      const allergenAnalysis = cosmeticScorer.analyzeAllergens(ingredients);
      
      expect(allergenAnalysis.detected_allergens).toHaveLength(3);
      expect(allergenAnalysis.total_allergens).toBe(3);
      expect(allergenAnalysis.risk_level).toBe('high'); // 2 allergènes haute prévalence
    });

    test('Doit calculer le niveau de risque allergène', () => {
      const lowRiskIngredients = ['AQUA', 'GLYCERIN'];
      const highRiskIngredients = ['LIMONENE', 'LINALOOL', 'EUGENOL', 'GERANIOL'];
      
      const lowRiskAnalysis = cosmeticScorer.analyzeAllergens(lowRiskIngredients);
      const highRiskAnalysis = cosmeticScorer.analyzeAllergens(highRiskIngredients);
      
      expect(lowRiskAnalysis.risk_level).toBe('low');
      expect(highRiskAnalysis.risk_level).toBe('high');
      expect(highRiskAnalysis.sensitive_skin_warning).toBe(true);
    });
  });

  describe('Analyse de formulation', () => {
    test('Doit évaluer la complexité de formulation', () => {
      const simpleFormulation = ['AQUA', 'GLYCERIN', 'TOCOPHEROL'];
      const complexFormulation = new Array(35).fill().map((_, i) => `INGREDIENT_${i}`);
      
      const simpleAnalysis = cosmeticScorer.analyzeFormulation(simpleFormulation);
      const complexAnalysis = cosmeticScorer.analyzeFormulation(complexFormulation);
      
      expect(simpleAnalysis.complexity).toBe('simple');
      expect(complexAnalysis.complexity).toBe('complex');
      expect(simpleAnalysis.formulation_score).toBeGreaterThan(complexAnalysis.formulation_score);
    });

    test('Doit estimer le ratio naturel/synthétique', () => {
      const naturalIngredients = ['ALOE EXTRACT', 'JOJOBA OIL', 'SHEA BUTTER'];
      const syntheticIngredients = ['SODIUM CHLORIDE', 'POLYMER-1', 'PARABEN'];
      
      const naturalAnalysis = cosmeticScorer.analyzeFormulation(naturalIngredients);
      const syntheticAnalysis = cosmeticScorer.analyzeFormulation(syntheticIngredients);
      
      expect(naturalAnalysis.natural_ratio).toBeGreaterThan(0.5);
      expect(syntheticAnalysis.synthetic_ratio).toBeGreaterThan(0.5);
    });
  });

  describe('Calcul du score final', () => {
    test('Doit calculer un score cohérent pour un produit sûr', async () => {
      const safeProduct = {
        ingredients: "AQUA, GLYCERIN, HYALURONIC ACID, TOCOPHEROL, ALOE EXTRACT"
      };
      
      const result = await cosmeticScorer.analyzeCosmetic(safeProduct);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.breakdown.safety.score).toBeGreaterThan(80);
    });

    test('Doit pénaliser un produit avec perturbateurs endocriniens', async () => {
      const riskyProduct = {
        ingredients: "AQUA, BUTYLPARABEN, TRICLOSAN, BHA, BENZOPHENONE-3"
      };
      
      const result = await cosmeticScorer.analyzeCosmetic(riskyProduct);
      
      expect(result.score).toBeLessThan(50);
      expect(result.breakdown.safety.score).toBeLessThan(60);
      expect(result.risk_analysis.endocrine_disruptors.length).toBeGreaterThan(0);
    });
  });

  describe('Calcul de la confidence', () => {
    test('Doit avoir une confidence élevée avec ingrédients reconnus', async () => {
      const knownProduct = {
        ingredients: "AQUA, GLYCERIN, HYALURONIC ACID, BUTYLPARABEN, LIMONENE"
      };
      
      const result = await cosmeticScorer.analyzeCosmetic(knownProduct);
      
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence_label).toMatch(/Fiable|Très fiable/);
    });

    test('Doit avoir une confidence faible avec ingrédients inconnus', async () => {
      const unknownProduct = {
        ingredients: "UNKNOWN_INGREDIENT_1, UNKNOWN_INGREDIENT_2, UNKNOWN_INGREDIENT_3"
      };
      
      const result = await cosmeticScorer.analyzeCosmetic(unknownProduct);
      
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.confidence_label).toMatch(/Faible|Modéré/);
    });
  });

  describe('Génération d\'alternatives', () => {
    test('Doit proposer alternatives pour produit avec perturbateurs', async () => {
      const productData = { ingredients: "BUTYLPARABEN, TRICLOSAN" };
      const analysisResult = {
        risk_analysis: { endocrine_disruptors: [{ name: 'BUTYLPARABEN' }] },
        allergen_analysis: { total_allergens: 0 },
        breakdown: { formulation: { details: { natural_ratio: 0.2 } } }
      };
      
      const alternatives = await cosmeticScorer.generateAlternatives(productData, analysisResult);
      
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives.some(alt => alt.type.includes('clean'))).toBe(true);
    });

    test('Doit proposer alternatives hypoallergéniques pour allergènes', async () => {
      const productData = { ingredients: "LIMONENE, LINALOOL, EUGENOL" };
      const analysisResult = {
        risk_analysis: { endocrine_disruptors: [] },
        allergen_analysis: { total_allergens: 3 },
        breakdown: { formulation: { details: { natural_ratio: 0.5 } } }
      };
      
      const alternatives = await cosmeticScorer.generateAlternatives(productData, analysisResult);
      
      expect(alternatives.some(alt => alt.type.includes('hypoallergénique'))).toBe(true);
    });
  });

  describe('Détection du type de produit', () => {
    test('Doit identifier correctement les types de produits', () => {
      expect(cosmeticScorer.detectProductType({ name: 'Crème hydratante' })).toBe('soin');
      expect(cosmeticScorer.detectProductType({ name: 'Shampoing doux' })).toBe('nettoyant');
      expect(cosmeticScorer.detectProductType({ category: 'makeup' })).toBe('maquillage');
      expect(cosmeticScorer.detectProductType({ name: 'Parfum' })).toBe('autre');
    });
  });

  describe('Gestion des erreurs', () => {
    test('Doit gérer les données d\'entrée invalides', async () => {
      const invalidProduct = {};
      
      await expect(cosmeticScorer.analyzeCosmetic(invalidProduct))
        .rejects.toThrow();
    });

    test('Doit gérer les ingrédients vides', () => {
      const emptyProduct = { ingredients: "" };
      
      const ingredients = cosmeticScorer.extractInciIngredients(emptyProduct);
      
      expect(ingredients).toHaveLength(0);
    });
  });

  describe('Méta-données', () => {
    test('Doit inclure les méta-données complètes', async () => {
      const product = {
        ingredients: "AQUA, GLYCERIN, HYALURONIC ACID"
      };
      
      const result = await cosmeticScorer.analyzeCosmetic(product);
      
      expect(result.meta).toBeDefined();
      expect(result.meta.ingredients_analyzed).toBe(3);
      expect(result.meta.processing_time_ms).toBeGreaterThan(0);
      expect(result.meta.sources).toContain('INCI Database');
      expect(result.meta.modules_active).toContain('risk_assessment');
    });
  });

  describe('Performance', () => {
    test('Doit analyser rapidement un produit standard', async () => {
      const product = {
        ingredients: "AQUA, GLYCERIN, CETYL ALCOHOL, DIMETHICONE, HYALURONIC ACID"
      };
      
      const startTime = Date.now();
      const result = await cosmeticScorer.analyzeCosmetic(product);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Moins d'1 seconde
      expect(result.meta.processing_time_ms).toBeLessThan(500);
    });
  });
});
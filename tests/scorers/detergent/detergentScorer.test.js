// 📝 FICHIER À CRÉER : tests/scorers/detergent/detergentScorer.test.js

const { DetergentScorer } = require('../../../src/scorers/detergent/detergentScorer');

describe('DetergentScorer', () => {
  let detergentScorer;

  beforeEach(() => {
    detergentScorer = new DetergentScorer();
  });

  describe('Produits Écologiques (Score Élevé)', () => {
    test('Lessive Bio Certifiée EU Ecolabel', async () => {
      const ingredients = "AQUA, COCO GLUCOSIDE, SODIUM BICARBONATE, CITRIC ACID, PROTEASE, LAVANDULA ANGUSTIFOLIA OIL";
      const productName = "Lessive Bio Concentrée";
      const certifications = ["EU ECOLABEL", "ECOCERT"];

      const result = await detergentScorer.analyzeDetergent(ingredients, productName, certifications);

      expect(result.score).toBeGreaterThan(80);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.breakdown.biodegradability.score).toBeGreaterThan(85);
      expect(result.breakdown.environmental.sustainability).toBe('excellent');
      expect(result.certifications_detected).toHaveLength(2);
      expect(result.detected_issues).toHaveLength(0);
    });

    test('Détergent DIY Naturel', async () => {
      const ingredients = "SODIUM BICARBONATE, CITRIC ACID, SODIUM PERCARBONATE";
      const productName = "Poudre Nettoyante Maison";

      const result = await detergentScorer.analyzeDetergent(ingredients, productName, []);

      expect(result.score).toBeGreaterThan(90);
      expect(result.breakdown.ecotoxicity.score).toBeGreaterThan(95);
      expect(result.breakdown.irritation.skin_safety).toBe('excellent');
      expect(result.alternatives[0].type).toBe('perfection');
    });
  });

  describe('Produits Problématiques (Score Faible)', () => {
    test('Lessive Conventionnelle Toxique', async () => {
      const ingredients = "AQUA, SODIUM LAURYL SULFATE, SODIUM TRIPOLYPHOSPHATE, METHYLISOTHIAZOLINONE, DICHLOROMETHANE, BHA";
      const productName = "Lessive Ultra-Dégraissante";

      const result = await detergentScorer.analyzeDetergent(ingredients, productName, []);

      expect(result.score).toBeLessThan(40);
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.detected_issues.length).toBeGreaterThan(2);
      expect(result.detected_issues.some(issue => issue.severity === 'critical')).toBe(true);
      expect(result.breakdown.biodegradability.score).toBeLessThan(50);
      expect(result.alternatives[0].type).toBe('urgent_replacement');
    });

    test('Détection Perturbateurs Endocriniens', async () => {
      const ingredients = "AQUA, SODIUM LAURETH SULFATE, BUTYLPARABEN, TRICLOSAN, BENZISOTHIAZOLINONE";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Nettoyant Multi-Surface", []);

      expect(result.score).toBeLessThan(60);
      const issuesText = result.detected_issues.map(i => i.issue).join(' ');
      expect(issuesText).toContain('Très toxique');
      expect(result.breakdown.ecotoxicity.penalties.length).toBeGreaterThan(2);
    });
  });

  describe('Produits Moyens (Score Modéré)', () => {
    test('Lessive Standard avec Améliorations Possibles', async () => {
      const ingredients = "AQUA, LAURYL GLUCOSIDE, SODIUM LAURETH SULFATE, PARFUM, LIMONENE, PROTEASE";
      const productName = "Lessive Classique";

      const result = await detergentScorer.analyzeDetergent(ingredients, productName, []);

      expect(result.score).toBeGreaterThan(50);
      expect(result.score).toBeLessThan(80);
      expect(result.alternatives[0].type).toBe('eco_certified');
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Certifications', () => {
    test('Détection Multiple Certifications', async () => {
      const productName = "ECOCERT Nordic Swan Cradle to Cradle Détergent";
      const ingredients = "COCO GLUCOSIDE, SODIUM BICARBONATE";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, productName, ["NORDIC SWAN"]);

      expect(result.certifications_detected.length).toBeGreaterThan(1);
      expect(result.breakdown.environmental.certification_bonus).toBeGreaterThan(20);
    });
  });

  describe('Normalisation Ingrédients', () => {
    test('Format String avec Séparateurs', async () => {
      const ingredients = "AQUA; COCO GLUCOSIDE, SODIUM BICARBONATE ; CITRIC ACID";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test", []);

      expect(result.score).toBeGreaterThan(80);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test('Format Array', async () => {
      const ingredients = ["AQUA", "COCO GLUCOSIDE", "SODIUM BICARBONATE", "CITRIC ACID"];
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test Array", []);

      expect(result.score).toBeGreaterThan(80);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test('Filtrage Eau', async () => {
      const ingredients = "WATER, AQUA, EAU, COCO GLUCOSIDE, SODIUM BICARBONATE";
      
      const normalizedIngredients = detergentScorer.normalizeIngredients(ingredients);
      
      expect(normalizedIngredients).not.toContain('WATER');
      expect(normalizedIngredients).not.toContain('AQUA');
      expect(normalizedIngredients).not.toContain('EAU');
      expect(normalizedIngredients).toContain('COCO GLUCOSIDE');
    });
  });

  describe('Scoring Détaillé', () => {
    test('Breakdown Écotoxicité', async () => {
      const ingredients = "SODIUM TRIPOLYPHOSPHATE, DICHLOROMETHANE";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test Toxique", []);

      expect(result.breakdown.ecotoxicity.penalties.length).toBe(2);
      expect(result.breakdown.ecotoxicity.penalties[0].penalty).toBeLessThan(-30);
      expect(result.breakdown.ecotoxicity.issues.length).toBeGreaterThan(0);
    });

    test('Breakdown Biodégradabilité', async () => {
      const ingredients = "COCO GLUCOSIDE, PROTEASE, SODIUM LAURYL SULFATE";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test Biodégradabilité", []);

      expect(result.breakdown.biodegradability.biodegradable_ratio).toBeGreaterThan(0);
      expect(result.breakdown.biodegradability.analysis.length).toBeGreaterThan(0);
      expect(result.breakdown.biodegradability.methodology).toContain('OECD 301');
    });

    test('Breakdown Irritation', async () => {
      const ingredients = "METHYLISOTHIAZOLINONE, LIMONENE, LINALOOL, COCO GLUCOSIDE";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test Irritation", []);

      expect(result.breakdown.irritation.allergens.length).toBeGreaterThan(0);
      expect(result.breakdown.irritation.irritants.length).toBeGreaterThan(0);
      expect(['excellent', 'good', 'moderate', 'poor']).toContain(result.breakdown.irritation.skin_safety);
    });

    test('Breakdown Environnemental', async () => {
      const ingredients = "COCO GLUCOSIDE, SODIUM BICARBONATE, CITRIC ACID";
      const certifications = ["EU ECOLABEL"];
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test Environnemental", certifications);

      expect(result.breakdown.environmental.natural_ratio).toBeGreaterThan(80);
      expect(result.breakdown.environmental.eco_bonus).toBeGreaterThan(0);
      expect(result.breakdown.environmental.certification_bonus).toBeGreaterThan(0);
      expect(['excellent', 'good', 'needs_improvement']).toContain(result.breakdown.environmental.sustainability);
    });
  });

  describe('Alternatives & Insights', () => {
    test('Génération Alternatives selon Score', async () => {
      const casTests = [
        { ingredients: "COCO GLUCOSIDE, SODIUM BICARBONATE", expectedType: 'perfection' },
        { ingredients: "LAURYL GLUCOSIDE, PARFUM", expectedType: 'eco_certified' },
        { ingredients: "SODIUM TRIPOLYPHOSPHATE, METHYLISOTHIAZOLINONE", expectedType: 'urgent_replacement' }
      ];

      for (const cas of casTests) {
        const result = await detergentScorer.analyzeDetergent(cas.ingredients, "Test", []);
        expect(result.alternatives[0].type).toBe(cas.expectedType);
      }
    });

    test('Insights Éducatifs avec Sources', async () => {
      const ingredients = "SODIUM TRIPOLYPHOSPHATE, COCO GLUCOSIDE";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test Insights", []);

      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights[0]).toHaveProperty('type');
      expect(result.insights[0]).toHaveProperty('title');
      expect(result.insights[0]).toHaveProperty('content');
      expect(result.insights[0]).toHaveProperty('source');
    });
  });

  describe('Gestion Erreurs', () => {
    test('Ingrédients Vides', async () => {
      await expect(detergentScorer.analyzeDetergent("", "", [])).rejects.toThrow();
    });

    test('Ingrédients Invalides', async () => {
      await expect(detergentScorer.analyzeDetergent(null, "Test", [])).rejects.toThrow();
    });

    test('Confidence Faible', async () => {
      const ingredients = "X"; // Ingrédient inconnu
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "", []);
      
      expect(result.confidence).toBeLessThan(0.4);
    });
  });

  describe('Méthodologie & Sources', () => {
    test('Sources Scientifiques', async () => {
      const ingredients = "COCO GLUCOSIDE, SODIUM BICARBONATE";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test Sources", []);

      expect(result.methodology).toContain('REACH');
      expect(result.methodology).toContain('ECHA');
      expect(result.methodology).toContain('2024');
    });

    test('Cohérence Score vs Breakdown', async () => {
      const ingredients = "COCO GLUCOSIDE, SODIUM BICARBONATE, CITRIC ACID, PROTEASE";
      
      const result = await detergentScorer.analyzeDetergent(ingredients, "Test Cohérence", []);

      // Le score final doit être cohérent avec les scores individuels
      const theoreticalScore = Math.round(
        result.breakdown.ecotoxicity.score * 0.30 +
        result.breakdown.biodegradability.score * 0.25 +
        result.breakdown.irritation.score * 0.25 +
        result.breakdown.environmental.score * 0.20
      );

      expect(Math.abs(result.score - theoreticalScore)).toBeLessThan(5); // Tolérance 5 points
    });
  });
});

// ===== TESTS D'INTÉGRATION API =====

describe('DetergentScorer - Tests API Integration', () => {
  test('Format Réponse API Compatible', async () => {
    const detergentScorer = new DetergentScorer();
    const ingredients = "COCO GLUCOSIDE, SODIUM BICARBONATE, CITRIC ACID";
    
    const result = await detergentScorer.analyzeDetergent(ingredients, "Test API", ["ECOCERT"]);

    // Vérifier structure attendue par API
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('breakdown');
    expect(result).toHaveProperty('alternatives');
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('detected_issues');
    expect(result).toHaveProperty('certifications_detected');
    expect(result).toHaveProperty('methodology');

    // Vérifier types
    expect(typeof result.score).toBe('number');
    expect(typeof result.confidence).toBe('number');
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(Array.isArray(result.insights)).toBe(true);
    expect(Array.isArray(result.detected_issues)).toBe(true);
  });
});
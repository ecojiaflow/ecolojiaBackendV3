/* 
===========================================
VERIFICATION : detergentClassifier.ts COMPLET
===========================================
*/

// PATH: backend/src/services/ai/detergentClassifier.ts
export interface DetergentAnalysisResult {
  ecoGrade: 'A' | 'B' | 'C' | 'D';
  environmentalRisks: string[];
  recommendations: string[];
  confidence: number;
  biodegradability: number;
  aquaticToxicity: 'low' | 'medium' | 'high';
  packaging: 'eco' | 'standard' | 'problematic';
}

export class DetergentClassifier {
  
  // Substances problématiques pour l'environnement
  private static readonly HARMFUL_SUBSTANCES = {
    'PHOSPHATES': {
      names: ['SODIUM TRIPOLYPHOSPHATE', 'PHOSPHATE', 'PENTASODIUM TRIPHOSPHATE'],
      impact: 'Eutrophisation des cours d\'eau',
      severity: 'high'
    },
    'CHLORINE': {
      names: ['SODIUM HYPOCHLORITE', 'CHLORINE BLEACH', 'WATER CHLORINATION'],
      impact: 'Toxique pour la vie aquatique',
      severity: 'high'
    },
    'EDTA': {
      names: ['EDTA', 'TETRASODIUM EDTA', 'DISODIUM EDTA'],
      impact: 'Non biodégradable, accumulation',
      severity: 'medium'
    },
    'OPTICAL_BRIGHTENERS': {
      names: ['OPTICAL BRIGHTENER', 'FLUORESCENT WHITENING AGENT', 'STILBENE'],
      impact: 'Persistant dans l\'environnement',
      severity: 'medium'
    },
    'SYNTHETIC_FRAGRANCE': {
      names: ['PARFUM', 'FRAGRANCE', 'LIMONENE', 'LINALOOL'],
      impact: 'Allergènes et polluants organiques',
      severity: 'low'
    },
    'SLS': {
      names: ['SODIUM LAURYL SULFATE', 'LAURYL SULFATE'],
      impact: 'Irritant pour organismes aquatiques',
      severity: 'medium'
    }
  };

  // Ingrédients éco-responsables
  private static readonly ECO_INGREDIENTS = [
    'SODIUM BICARBONATE', 'CITRIC ACID', 'VINEGAR', 'SOAP', 'COCONUT OIL',
    'PALM KERNEL OIL', 'OLIVE OIL', 'ESSENTIAL OILS', 'PLANT EXTRACTS'
  ];

  static async analyzeComposition(composition: string): Promise<DetergentAnalysisResult> {
    const ingredients = composition.toUpperCase().split(/[,;]/).map(s => s.trim());
    const environmentalRisks: string[] = [];
    let totalImpactScore = 0;
    let biodegradabilityScore = 100;
    let aquaticToxicityLevel: 'low' | 'medium' | 'high' = 'low';

    // Analyser chaque ingrédient
    for (const ingredient of ingredients) {
      // Vérifier les substances nocives
      for (const [category, data] of Object.entries(this.HARMFUL_SUBSTANCES)) {
        if (data.names.some(name => ingredient.includes(name))) {
          environmentalRisks.push(`${data.impact} (${ingredient})`);
          
          // Calculer l'impact
          const impactScore = data.severity === 'high' ? 40 : data.severity === 'medium' ? 25 : 15;
          totalImpactScore += impactScore;
          
          // Réduire la biodégradabilité
          const biodegradabilityPenalty = data.severity === 'high' ? 30 : data.severity === 'medium' ? 20 : 10;
          biodegradabilityScore -= biodegradabilityPenalty;
          
          // Augmenter la toxicité aquatique
          if (data.severity === 'high') {
            aquaticToxicityLevel = 'high';
          } else if (data.severity === 'medium' && aquaticToxicityLevel !== 'high') {
            aquaticToxicityLevel = 'medium';
          }
        }
      }
    }

    // Calculer le grade environnemental
    const ecoGrade = this.calculateEcoGrade(totalImpactScore, biodegradabilityScore);
    
    // Évaluer l'emballage (simulation basée sur le grade)
    const packaging = this.evaluatePackaging(ecoGrade);
    
    // Générer les recommandations
    const recommendations = this.generateEnvironmentalRecommendations(
      ecoGrade, 
      environmentalRisks, 
      biodegradabilityScore
    );

    // Calculer la confiance
    const confidence = this.calculateAnalysisConfidence(ingredients.length);

    return {
      ecoGrade,
      environmentalRisks: environmentalRisks.length > 0 ? environmentalRisks : ['Impact environnemental faible'],
      recommendations,
      confidence,
      biodegradability: Math.max(0, biodegradabilityScore),
      aquaticToxicity: aquaticToxicityLevel,
      packaging
    };
  }

  private static calculateEcoGrade(impactScore: number, biodegradabilityScore: number): 'A' | 'B' | 'C' | 'D' {
    if (impactScore === 0 && biodegradabilityScore >= 90) return 'A';
    if (impactScore <= 25 && biodegradabilityScore >= 70) return 'B';
    if (impactScore <= 60 && biodegradabilityScore >= 40) return 'C';
    return 'D';
  }

  private static evaluatePackaging(ecoGrade: string): 'eco' | 'standard' | 'problematic' {
    // Simulation basée sur le grade écologique
    switch (ecoGrade) {
      case 'A': return 'eco';
      case 'B': return Math.random() > 0.5 ? 'eco' : 'standard';
      case 'C': return 'standard';
      default: return 'problematic';
    }
  }

  private static generateEnvironmentalRecommendations(
    grade: string,
    risks: string[],
    biodegradability: number
  ): string[] {
    const recommendations: string[] = [];

    switch (grade) {
      case 'A':
        recommendations.push('Excellent choix écologique !');
        recommendations.push('Produit respectueux de l\'environnement');
        break;
      
      case 'B':
        recommendations.push('Bon produit avec impact environnemental limité');
        recommendations.push('Quelques améliorations possibles');
        break;
      
      case 'C':
        recommendations.push('Impact environnemental modéré');
        recommendations.push('Considérez des alternatives plus écologiques');
        break;
      
      case 'D':
        recommendations.push('Fort impact environnemental');
        recommendations.push('Recherchez des produits écolabellisés');
        break;
    }

    // Recommandations spécifiques selon la biodégradabilité
    if (biodegradability < 50) {
      recommendations.push('Composants peu biodégradables - limitez l\'usage');
    }

    // Recommandations générales
    recommendations.push('Dosez selon les instructions pour réduire l\'impact');
    recommendations.push('Privilégiez les recharges pour limiter les emballages');
    recommendations.push('Recherchez les labels Ecocert ou EU Ecolabel');

    return recommendations;
  }

  private static calculateAnalysisConfidence(ingredientCount: number): number {
    if (ingredientCount === 0) return 0.3;
    
    // Plus il y a d'ingrédients analysés, plus la confiance est élevée
    const baseConfidence = Math.min(ingredientCount / 15, 1);
    return Math.max(0.4, Math.min(0.9, baseConfidence));
  }

  // Analyses spécialisées par type de produit
  static async analyzeLaundryDetergent(composition: string): Promise<DetergentAnalysisResult> {
    const result = await this.analyzeComposition(composition);
    
    // Recommandations spécifiques aux lessives
    result.recommendations.push('Utilisez eau froide pour économiser l\'énergie');
    result.recommendations.push('Vérifiez la dureté de votre eau');
    
    return result;
  }

  static async analyzeDishwashingLiquid(composition: string): Promise<DetergentAnalysisResult> {
    const result = await this.analyzeComposition(composition);
    
    // Recommandations spécifiques aux liquides vaisselle
    result.recommendations.push('Quelques gouttes suffisent');
    result.recommendations.push('Évitez le contact prolongé avec la peau');
    
    return result;
  }

  static async analyzeAllPurposeCleaner(composition: string): Promise<DetergentAnalysisResult> {
    const result = await this.analyzeComposition(composition);
    
    // Recommandations spécifiques aux nettoyants multi-usages
    result.recommendations.push('Aérez lors de l\'utilisation');
    result.recommendations.push('Testez sur surface non visible');
    
    return result;
  }
}

/* 
===========================================
RÉPONSE : OUI, LE FICHIER EST 100% COMPLET !
===========================================

✅ Interface DetergentAnalysisResult complète
✅ Classe DetergentClassifier avec toutes les méthodes
✅ Base de données substances nocives
✅ Algorithme de calcul eco-grade
✅ Recommandations environnementales
✅ Analyses spécialisées (lessive, vaisselle, multi-usage)
✅ Gestion biodégradabilité et toxicité aquatique
✅ Calcul de confiance

LE FICHIER detergentClassifier.ts DANS L'ARTIFACT EST COMPLET !
*/
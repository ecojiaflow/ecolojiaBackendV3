// PATH: backend/src/services/ai/cosmeticClassifier.ts
export interface CosmeticAnalysisResult {
  safetyGrade: 'A' | 'B' | 'C' | 'D';
  riskFactors: string[];
  recommendations: string[];
  confidence: number;
  concerningIngredients: string[];
  benefits: string[];
}

export class CosmeticClassifier {
  
  // Base de données des ingrédients préoccupants
  private static readonly CONCERNING_INGREDIENTS = {
    'PARABEN': {
      names: ['METHYLPARABEN', 'PROPYLPARABEN', 'BUTYLPARABEN', 'ETHYLPARABEN'],
      risk: 'Perturbateur endocrinien potentiel',
      severity: 'medium'
    },
    'SULFATE': {
      names: ['SODIUM LAURYL SULFATE', 'SODIUM LAURETH SULFATE', 'SLS', 'SLES'],
      risk: 'Irritant pour la peau et les yeux',
      severity: 'low'
    },
    'FORMALDEHYDE': {
      names: ['FORMALDEHYDE', 'FORMALIN', 'DMDM HYDANTOIN', 'IMIDAZOLIDINYL UREA'],
      risk: 'Cancérigène possible, allergène',
      severity: 'high'
    },
    'SILICONE': {
      names: ['DIMETHICONE', 'CYCLOPENTASILOXANE', 'CYCLOHEXASILOXANE'],
      risk: 'Non biodégradable, effet occlusif',
      severity: 'low'
    },
    'MINERAL_OIL': {
      names: ['PARAFFINUM LIQUIDUM', 'PETROLATUM', 'MINERAL OIL'],
      risk: 'Dérivé du pétrole, effet occlusif',
      severity: 'medium'
    },
    'ALCOHOL': {
      names: ['ALCOHOL DENAT', 'ETHANOL', 'ISOPROPYL ALCOHOL'],
      risk: 'Dessèchement de la peau',
      severity: 'low'
    }
  };

  // Ingrédients bénéfiques
  private static readonly BENEFICIAL_INGREDIENTS = [
    'ALOE VERA', 'HYALURONIC ACID', 'GLYCERIN', 'SHEA BUTTER', 'ARGAN OIL',
    'VITAMIN E', 'VITAMIN C', 'NIACINAMIDE', 'CERAMIDE', 'PEPTIDES',
    'RETINOL', 'SALICYLIC ACID', 'LACTIC ACID', 'JOJOBA OIL', 'ROSEHIP OIL'
  ];

  static async analyzeIngredients(ingredients: string[]): Promise<CosmeticAnalysisResult> {
    const concerningIngredients: string[] = [];
    const riskFactors: string[] = [];
    const benefits: string[] = [];
    let totalRiskScore = 0;

    // Normaliser les ingrédients en majuscules
    const normalizedIngredients = ingredients.map(ing => ing.toUpperCase().trim());

    // Analyser chaque ingrédient
    for (const ingredient of normalizedIngredients) {
      // Vérifier les ingrédients préoccupants
      for (const [category, data] of Object.entries(this.CONCERNING_INGREDIENTS)) {
        if (data.names.some(name => ingredient.includes(name))) {
          concerningIngredients.push(ingredient);
          riskFactors.push(`${data.risk} (${ingredient})`);
          
          // Calculer le score de risque
          const riskScore = data.severity === 'high' ? 30 : data.severity === 'medium' ? 20 : 10;
          totalRiskScore += riskScore;
        }
      }

      // Vérifier les ingrédients bénéfiques
      if (this.BENEFICIAL_INGREDIENTS.some(beneficial => ingredient.includes(beneficial))) {
        benefits.push(ingredient);
      }
    }

    // Calculer le grade de sécurité
    const safetyGrade = this.calculateSafetyGrade(totalRiskScore, concerningIngredients.length);
    
    // Générer les recommandations
    const recommendations = this.generateRecommendations(safetyGrade, concerningIngredients, benefits);

    // Calculer la confiance
    const confidence = this.calculateConfidence(ingredients.length, concerningIngredients.length);

    return {
      safetyGrade,
      riskFactors: riskFactors.length > 0 ? riskFactors : ['Aucun ingrédient préoccupant identifié'],
      recommendations,
      confidence,
      concerningIngredients,
      benefits
    };
  }

  private static calculateSafetyGrade(riskScore: number, concerningCount: number): 'A' | 'B' | 'C' | 'D' {
    if (riskScore === 0) return 'A';
    if (riskScore <= 20 && concerningCount <= 2) return 'B';
    if (riskScore <= 50 && concerningCount <= 4) return 'C';
    return 'D';
  }

  private static generateRecommendations(
    grade: string, 
    concerning: string[], 
    benefits: string[]
  ): string[] {
    const recommendations: string[] = [];

    switch (grade) {
      case 'A':
        recommendations.push('Excellent choix ! Composition très sûre');
        if (benefits.length > 0) {
          recommendations.push(`Contient des ingrédients bénéfiques : ${benefits.slice(0, 3).join(', ')}`);
        }
        break;
      
      case 'B':
        recommendations.push('Bon produit avec quelques points d\'attention');
        if (concerning.length > 0) {
          recommendations.push('Surveillez votre tolérance aux ingrédients signalés');
        }
        break;
      
      case 'C':
        recommendations.push('Produit correct mais perfectible');
        recommendations.push('Considérez des alternatives plus naturelles');
        break;
      
      case 'D':
        recommendations.push('Évitez ce produit si vous avez la peau sensible');
        recommendations.push('Recherchez des produits certifiés bio');
        break;
    }

    // Recommandations générales
    recommendations.push('Testez sur une petite zone avant utilisation');
    recommendations.push('Consultez la liste complète des ingrédients INCI');

    return recommendations;
  }

  private static calculateConfidence(totalIngredients: number, analyzedIngredients: number): number {
    if (totalIngredients === 0) return 0.3;
    
    const analysisRatio = analyzedIngredients / totalIngredients;
    const baseConfidence = Math.min(totalIngredients / 20, 1); // Plus d'ingrédients = plus de confiance
    
    return Math.max(0.4, Math.min(0.95, baseConfidence + analysisRatio * 0.3));
  }

  // Analyse spécialisée par type de produit
  static async analyzeSkinCare(ingredients: string[]): Promise<CosmeticAnalysisResult> {
    const result = await this.analyzeIngredients(ingredients);
    
    // Ajout de recommandations spécifiques aux soins de la peau
    result.recommendations.push('Appliquez une protection solaire en journée');
    result.recommendations.push('Adaptez votre routine selon votre type de peau');
    
    return result;
  }

  static async analyzeHairCare(ingredients: string[]): Promise<CosmeticAnalysisResult> {
    const result = await this.analyzeIngredients(ingredients);
    
    // Ajout de recommandations spécifiques aux soins capillaires
    result.recommendations.push('Alternez avec des shampoings doux');
    result.recommendations.push('Utilisez un après-shampoing pour protéger');
    
    return result;
  }
}

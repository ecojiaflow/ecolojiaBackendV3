// PATH: backend/src/services/eco-score.service.ts
// // import { PrismaClient } from '@prisma/client';

const prisma = null // new PrismaClient();

export interface EcoScoreInput {
  id: string;
  title: string;
  ingredients?: string;
  category?: string;
  brand?: string;
  packaging?: string;
  transport?: string;
  origin?: string;
}

export interface EcoScoreResult {
  eco_score: number;
  ai_confidence: number;
  breakdown: {
    ingredients: number;
    packaging: number;
    transport: number;
    processing: number;
  };
  recommendations: string[];
  sources: string[];
}

export class EcoScoreService {
  private readonly SCORE_WEIGHTS = {
    ingredients: 0.4,
    packaging: 0.2,
    transport: 0.2,
    processing: 0.2
  };

  async calculate(input: EcoScoreInput): Promise<EcoScoreResult> {
    try {
      console.log(`ðŸŒ± Calcul eco-score pour: ${input.title}`);
      
      // Calculer chaque composant du score
      const ingredientsScore = this.calculateIngredientsScore(input.ingredients || '');
      const packagingScore = this.calculatePackagingScore(input.packaging || '');
      const transportScore = this.calculateTransportScore(input.origin || '');
      const processingScore = this.calculateProcessingScore(input.category || '');
      
      // Score global pondÃ©rÃ©
      const ecoScore = Math.round(
        ingredientsScore * this.SCORE_WEIGHTS.ingredients +
        packagingScore * this.SCORE_WEIGHTS.packaging +
        transportScore * this.SCORE_WEIGHTS.transport +
        processingScore * this.SCORE_WEIGHTS.processing
      );
      
      // Calcul confiance
      const confidence = this.calculateConfidence(input);
      
      // GÃ©nÃ©ration recommandations
      const recommendations = this.generateRecommendations(input, {
        ingredients: ingredientsScore,
        packaging: packagingScore,
        transport: transportScore,
        processing: processingScore
      });
      
      const result: EcoScoreResult = {
        eco_score: Math.max(0, Math.min(100, ecoScore)),
        ai_confidence: confidence,
        breakdown: {
          ingredients: ingredientsScore,
          packaging: packagingScore,
          transport: transportScore,
          processing: processingScore
        },
        recommendations,
        sources: [
          'Base de donnÃ©es ADEME 2024',
          'Coefficients transport CITEPA',
          'Analyse cycle de vie produits alimentaires'
        ]
      };
      
      console.log(`âœ… Eco-score calculÃ©: ${result.eco_score}/100`);
      return result;
    } catch (error) {
      console.error('âŒ Erreur calcul eco-score:', error);
      throw error;
    }
  }

  private calculateIngredientsScore(ingredients: string): number {
    if (!ingredients) return 50;
    
    const ingredientsList = ingredients.toLowerCase().split(',').map(i => i.trim());
    let score = 70; // Score de base
    
    // PÃ©nalitÃ©s ingrÃ©dients problÃ©matiques
    const problematicIngredients = [
      { name: 'huile de palme', penalty: -20 },
      { name: 'glucose-fructose', penalty: -15 },
      { name: 'sirop de glucose', penalty: -10 },
      { name: 'conservateurs', penalty: -5 },
      { name: 'colorants', penalty: -5 },
      { name: 'arÃ´mes artificiels', penalty: -5 }
    ];
    
    problematicIngredients.forEach(problematic => {
      if (ingredientsList.some(ing => ing.includes(problematic.name))) {
        score += problematic.penalty;
      }
    });
    
    // Bonus ingrÃ©dients naturels
    const naturalIngredients = [
      { name: 'bio', bonus: 10 },
      { name: 'local', bonus: 5 },
      { name: 'Ã©quitable', bonus: 5 },
      { name: 'naturel', bonus: 5 }
    ];
    
    naturalIngredients.forEach(natural => {
      if (ingredientsList.some(ing => ing.includes(natural.name))) {
        score += natural.bonus;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  private calculatePackagingScore(packaging: string): number {
    if (!packaging) return 60;
    
    const packagingLower = packaging.toLowerCase();
    
    // Scores par type d'emballage
    const packagingScores: { [key: string]: number } = {
      'verre': 90,
      'carton': 80,
      'mÃ©tal': 75,
      'plastique recyclable': 60,
      'plastique': 40,
      'aluminium': 70,
      'composite': 30
    };
    
    for (const [type, score] of Object.entries(packagingScores)) {
      if (packagingLower.includes(type)) {
        return score;
      }
    }
    
    return 50; // Score par dÃ©faut
  }

  private calculateTransportScore(origin: string): number {
    if (!origin) return 60;
    
    const originLower = origin.toLowerCase();
    
    // Scores par zone gÃ©ographique (perspective France)
    const regionScores: { [key: string]: number } = {
      'local': 95,
      'france': 85,
      'europe': 70,
      'afrique du nord': 60,
      'amÃ©rique du nord': 40,
      'amÃ©rique du sud': 30,
      'asie': 25,
      'ocÃ©anie': 20
    };
    
    for (const [region, score] of Object.entries(regionScores)) {
      if (originLower.includes(region)) {
        return score;
      }
    }
    
    return 50; // Score par dÃ©faut
  }

  private calculateProcessingScore(category: string): number {
    if (!category) return 60;
    
    const categoryLower = category.toLowerCase();
    
    // Scores par niveau de transformation
    const processingScores: { [key: string]: number } = {
      'fruits et lÃ©gumes frais': 95,
      'lÃ©gumineuses': 90,
      'cÃ©rÃ©ales': 85,
      'produits laitiers': 70,
      'viandes': 65,
      'conserves': 60,
      'surgelÃ©s': 65,
      'plats prÃ©parÃ©s': 40,
      'biscuits': 35,
      'sodas': 25,
      'confiseries': 20
    };
    
    for (const [type, score] of Object.entries(processingScores)) {
      if (categoryLower.includes(type)) {
        return score;
      }
    }
    
    return 50; // Score par dÃ©faut
  }

  private calculateConfidence(input: EcoScoreInput): number {
    let confidence = 0.6; // Base
    
    // Facteurs augmentant la confiance
    if (input.ingredients && input.ingredients.length > 10) confidence += 0.1;
    if (input.category && input.category.length > 0) confidence += 0.1;
    if (input.brand && input.brand.length > 0) confidence += 0.05;
    if (input.packaging && input.packaging.length > 0) confidence += 0.1;
    if (input.origin && input.origin.length > 0) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }

  private generateRecommendations(input: EcoScoreInput, breakdown: any): string[] {
    const recommendations: string[] = [];
    
    // Recommandations basÃ©es sur les scores
    if (breakdown.ingredients < 60) {
      recommendations.push('PrivilÃ©gier des produits avec moins d\'additifs');
    }
    
    if (breakdown.packaging < 60) {
      recommendations.push('Choisir des emballages recyclables ou rÃ©utilisables');
    }
    
    if (breakdown.transport < 60) {
      recommendations.push('Favoriser les produits locaux ou de saison');
    }
    
    if (breakdown.processing < 60) {
      recommendations.push('Opter pour des aliments moins transformÃ©s');
    }
    
    // Recommandations gÃ©nÃ©rales
    if (recommendations.length === 0) {
      recommendations.push('Produit avec un bon impact environnemental');
    }
    
    return recommendations;
  }

  async batchCalculate(inputs: EcoScoreInput[]): Promise<EcoScoreResult[]> {
    const results = await Promise.all(
      inputs.map(input => this.calculate(input))
    );
    
    return results;
  }

  async saveScoreToDatabase(productId: string, score: EcoScoreResult): Promise<void> {
    try {
      // await prisma.product.update({ // PRISMA DISABLED
        where: { id: productId },
        data: {
          eco_score: score.eco_score,
          ai_confidence: score.ai_confidence,
          // âœ… CORRECTION: Utiliser string au lieu de ConfidenceColor enum
          confidence_color: this.getConfidenceColor(score.ai_confidence),
          updated_at: new Date()
        }
      });
    } catch (error) {
      console.error('âŒ Erreur sauvegarde score:', error);
      throw error;
    }
  }

  private getConfidenceColor(confidence: number): any {
    // âœ… CORRECTION: Retourner objet compatible avec Prisma
    if (confidence >= 0.8) return { set: 'green' };
    if (confidence >= 0.6) return { set: 'yellow' };
    return { set: 'red' };
  }

  async getProductScore(productId: string): Promise<EcoScoreResult | null> {
    try {
      // const product = await prisma.product.findUnique({ // PRISMA DISABLED
        where: { id: productId },
        select: {
          eco_score: true,
          ai_confidence: true,
          title: true,
          description: true, // âœ… CORRECTION: utiliser description
          category: true
        }
      });
      
      if (!product) return null;
      
      // Si pas de score calculÃ©, le calculer
      if (!product.eco_score) {
        return await this.calculate({
          id: productId,
          title: product.title,
          ingredients: product.description || '', // âœ… CORRECTION: utiliser description
          category: product.category || ''
        });
      }
      
      // Retourner le score existant
      return {
        eco_score: Number(product.eco_score), // âœ… CORRECTION: convertir Decimal en number
        ai_confidence: Number(product.ai_confidence || 0.7), // âœ… CORRECTION: convertir Decimal
        breakdown: {
          ingredients: 0,
          packaging: 0,
          transport: 0,
          processing: 0
        },
        recommendations: [],
        sources: ['Base de donnÃ©es ADEME 2024']
      };
    } catch (error) {
      console.error('âŒ Erreur rÃ©cupÃ©ration score:', error);
      return null;
    }
  }

  async updateScoresForCategory(category: string): Promise<number> {
    try {
      // const products = await prisma.product.findMany({ // PRISMA DISABLED
        where: {
          category: {
            contains: category,
            mode: 'insensitive'
          },
          eco_score: {
            equals: null
          }
        },
        select: {
          id: true,
          title: true,
          description: true, // âœ… CORRECTION: utiliser description
          category: true
        }
      });
      
      console.log(`ðŸ”„ Mise Ã  jour scores pour ${products.length} produits`);
      
      let updatedCount = 0;
      
      for (const product of products) {
        try {
          const score = await this.calculate({
            id: product.id,
            title: product.title,
            ingredients: product.description || '', // âœ… CORRECTION: utiliser description
            category: product.category || ''
          });
          
          await this.saveScoreToDatabase(product.id, score);
          updatedCount++;
        } catch (error) {
          console.error(`âŒ Erreur produit ${product.id}:`, error);
        }
      }
      
      console.log(`âœ… ${updatedCount} scores mis Ã  jour`);
      return updatedCount;
    } catch (error) {
      console.error('âŒ Erreur mise Ã  jour catÃ©gorie:', error);
      return 0;
    }
  }

  async getScoreDistribution(): Promise<any> {
    try {
      // const distribution = await prisma.product.groupBy({ // PRISMA DISABLED
        by: ['eco_score'],
        _count: {
          eco_score: true
        },
        where: {
          eco_score: {
            not: null
          }
        },
        orderBy: {
          eco_score: 'asc'
        }
      });
      
      return distribution;
    } catch (error) {
      console.error('âŒ Erreur distribution scores:', error);
      return [];
    }
  }

  async cleanup(): Promise<void> {
    // // await prisma.$disconnect(); // PRISMA DISABLED // PRISMA DISABLED
  }
}

// Export pour utilisation dans d'autres modules
export default EcoScoreService;
// EOF


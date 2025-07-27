// PATH: backend/src/services/product.service.ts
// // import { PrismaClient } from '@prisma/client';
import { EcoScoreService } from './eco-score.service';

const prisma = null // new PrismaClient();

export class ProductService {
  private ecoScoreService: EcoScoreService;

  constructor() {
    this.ecoScoreService = new EcoScoreService();
  }

  async analyzeProductFromText(text: string) {
    try {
      console.log('ðŸ” Analyse produit depuis texte:', text);
      
      // Extraction des informations depuis le texte
      const productInfo = this.extractProductInfo(text);
      
      // âœ… CORRECTION: Utiliser la mÃ©thode qui existe
      const aiResult = await this.ecoScoreService.calculate({
        id: `text-analysis-${Date.now()}`,
        title: productInfo.title,
        ingredients: productInfo.ingredients,
        category: productInfo.category
      });
      
      return {
        success: true,
        product: productInfo,
        ecoScore: aiResult,
        analysis: {
          confidence: aiResult.ai_confidence,
          recommendations: aiResult.recommendations
        }
      };
    } catch (error) {
      console.error('âŒ Erreur analyse texte:', error);
      throw error;
    }
  }

  private extractProductInfo(text: string) {
    // Logique simplifiÃ©e d'extraction
    const lines = text.split('\n').filter(line => line.trim());
    
    let title = 'Produit analysÃ©';
    let ingredients = '';
    let category = 'Non classÃ©';
    
    // Tentative d'extraction du titre (premiÃ¨re ligne non vide)
    if (lines.length > 0) {
      title = lines[0].trim();
    }
    
    // Recherche des ingrÃ©dients
    const ingredientsLine = lines.find(line => 
      line.toLowerCase().includes('ingrÃ©dients') || 
      line.toLowerCase().includes('composition') ||
      line.includes('E') || 
      line.includes('%')
    );
    
    if (ingredientsLine) {
      ingredients = ingredientsLine.replace(/^[^:]*:/, '').trim();
    }
    
    // DÃ©tection de catÃ©gorie basique
    const textLower = text.toLowerCase();
    if (textLower.includes('cosmÃ©tique') || textLower.includes('crÃ¨me') || textLower.includes('shampoing')) {
      category = 'cosmÃ©tique';
    } else if (textLower.includes('dÃ©tergent') || textLower.includes('lessive') || textLower.includes('nettoyant')) {
      category = 'dÃ©tergent';
    } else if (textLower.includes('alimentaire') || textLower.includes('food') || textLower.includes('nutrition')) {
      category = 'alimentaire';
    }
    
    return {
      title,
      ingredients,
      category,
      extractedText: text
    };
  }

  async searchProducts(query: string, category?: string, limit: number = 20) {
    try {
      const whereClause: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } }
        ]
      };
      
      if (category) {
        whereClause.category = { contains: category, mode: 'insensitive' };
      }
      
      // const products = await prisma.product.findMany({ // PRISMA DISABLED
        where: whereClause,
        take: limit,
        orderBy: { updated_at: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          brand: true,
          category: true,
          eco_score: true,
          ai_confidence: true,
          images: true,
          verified_status: true
        }
      });
      
      return {
        success: true,
        results: products,
        count: products.length
      };
    } catch (error) {
      console.error('âŒ Erreur recherche produits:', error);
      throw error;
    }
  }

  async getProductById(id: string) {
    try {
      // const product = await prisma.product.findUnique({ // PRISMA DISABLED
        where: { id }
        // âœ… CORRECTION: supprimer _count qui n'existe pas
      });
      
      if (!product) {
        return { success: false, error: 'Produit non trouvÃ©' };
      }
      
      return {
        success: true,
        product
      };
    } catch (error) {
      console.error('âŒ Erreur rÃ©cupÃ©ration produit:', error);
      throw error;
    }
  }

  async updateProductScore(id: string) {
    try {
      // const product = await prisma.product.findUnique({ // PRISMA DISABLED
        where: { id },
        select: {
          id: true,
          title: true,
          description: true, // âœ… CORRECTION: utiliser description
          category: true
        }
      });
      
      if (!product) {
        return { success: false, error: 'Produit non trouvÃ©' };
      }
      
      const newScore = await this.ecoScoreService.calculate({
        id: product.id,
        title: product.title,
        ingredients: product.description || '', // âœ… CORRECTION: utiliser description
        category: product.category || ''
      });
      
      await this.ecoScoreService.saveScoreToDatabase(id, newScore);
      
      return {
        success: true,
        message: 'Score mis Ã  jour',
        score: newScore
      };
    } catch (error) {
      console.error('âŒ Erreur mise Ã  jour score:', error);
      throw error;
    }
  }

  async getProductsByCategory(category: string, limit: number = 50) {
    try {
      // const products = await prisma.product.findMany({ // PRISMA DISABLED
        where: {
          category: { contains: category, mode: 'insensitive' }
        },
        take: limit,
        orderBy: { eco_score: 'desc' },
        select: {
          id: true,
          title: true,
          brand: true,
          category: true,
          eco_score: true,
          ai_confidence: true,
          verified_status: true
        }
      });
      
      return {
        success: true,
        category,
        results: products,
        count: products.length
      };
    } catch (error) {
      console.error('âŒ Erreur produits par catÃ©gorie:', error);
      throw error;
    }
  }

  async getTopProducts(limit: number = 10) {
    try {
      // const products = await prisma.product.findMany({ // PRISMA DISABLED
        where: {
          eco_score: { not: null }
        },
        take: limit,
        orderBy: { eco_score: 'desc' },
        select: {
          id: true,
          title: true,
          brand: true,
          category: true,
          eco_score: true,
          ai_confidence: true
        }
      });
      
      return {
        success: true,
        results: products,
        count: products.length
      };
    } catch (error) {
      console.error('âŒ Erreur top produits:', error);
      throw error;
    }
  }

  async getProductStats() {
    try {
      // const totalProducts = await prisma.product.count(); // PRISMA DISABLED
      // const verifiedProducts = await prisma.product.count({ // PRISMA DISABLED
        where: { verified_status: 'verified' }
      });
      // const avgScore = await prisma.product.aggregate({ // PRISMA DISABLED
        _avg: { eco_score: true }
      });
      
      // const categoryStats = await prisma.product.groupBy({ // PRISMA DISABLED
        by: ['category'],
        _count: { category: true },
        _avg: { eco_score: true }
      });
      
      return {
        success: true,
        stats: {
          total: totalProducts,
          verified: verifiedProducts,
          averageScore: avgScore._avg.eco_score || 0,
          categories: categoryStats
        }
      };
    } catch (error) {
      console.error('âŒ Erreur statistiques produits:', error);
      throw error;
    }
  }

  async cleanup() {
    // // await prisma.$disconnect(); // PRISMA DISABLED // PRISMA DISABLED
  }
}

export default ProductService;
// EOF


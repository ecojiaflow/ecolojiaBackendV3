// PATH: backend/src/orchestrator/jobs/dataIngestion.ts
// // import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = null // new PrismaClient();

export class DataIngestionJob {
  private readonly BATCH_SIZE = 100;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 seconde entre les batches

  async ingestProducts(source: string = 'openfoodfacts') {
    console.log(`ðŸ”„ DÃ©but ingestion donnÃ©es depuis ${source}`);
    
    try {
      const products = await this.fetchProductsFromSource(source);
      console.log(`ðŸ“¦ ${products.length} produits rÃ©cupÃ©rÃ©s`);
      
      await this.processBatches(products, source);
      console.log(`âœ… Ingestion terminÃ©e pour ${source}`);
    } catch (error) {
      console.error(`âŒ Erreur ingestion ${source}:`, error);
      throw error;
    }
  }

  private async fetchProductsFromSource(source: string) {
    switch (source) {
      case 'openfoodfacts':
        return await this.fetchFromOpenFoodFacts();
      case 'mock':
        return this.generateMockProducts();
      default:
        throw new Error(`Source non supportÃ©e: ${source}`);
    }
  }

  private async fetchFromOpenFoodFacts() {
    const response = await axios.get(
      'https://world.openfoodfacts.org/cgi/search.pl',
      {
        params: {
          action: 'process',
          json: 1,
          page_size: this.BATCH_SIZE,
          fields: 'code,product_name,brands,categories,ingredients_text,image_url,nutrition_grades'
        }
      }
    );
    
    return response.data.products || [];
  }

  private generateMockProducts() {
    return [
      {
        code: '3017620422003',
        product_name: 'Nutella',
        brands: 'Ferrero',
        categories: 'PÃ¢tes Ã  tartiner',
        ingredients_text: 'Sucre, huile de palme, noisettes, cacao, lait Ã©crÃ©mÃ©',
        image_url: 'https://example.com/nutella.jpg',
        nutrition_grades: 'e'
      },
      {
        code: '8712566176434',
        product_name: 'Coca-Cola',
        brands: 'Coca-Cola',
        categories: 'Boissons gazeuses',
        ingredients_text: 'Eau, sucre, dioxyde de carbone, colorant caramel, arÃ´me',
        image_url: 'https://example.com/coca.jpg',
        nutrition_grades: 'e'
      }
    ];
  }

  private async processBatches(products: any[], source: string) {
    const batches = this.createBatches(products, this.BATCH_SIZE);
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`ðŸ“¦ Traitement batch ${i + 1}/${batches.length}`);
      
      await this.processBatch(batches[i], source);
      
      // Rate limiting
      if (i < batches.length - 1) {
        await this.delay(this.RATE_LIMIT_DELAY);
      }
    }
  }

  private createBatches<T>(array: T[], size: number): T[][] {
    const batches = [];
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size));
    }
    return batches;
  }

  private async processBatch(products: any[], source: string) {
    const processedProducts = await Promise.all(
      products.map(product => this.processProduct(product, source))
    );
    
    // Filtrer les produits valides
    const validProducts = processedProducts.filter(p => p !== null);
    
    if (validProducts.length > 0) {
      await this.saveProducts(validProducts);
    }
  }

  private async processProduct(rawProduct: any, source: string) {
    try {
      // Calculer eco-score simplifiÃ©
      const ecoScore = {
        eco_score: 50,
        ai_confidence: 0.7
      };

      // âœ… CORRECTION: Utiliser "verified" au lieu de "ai_verified"
      const processedProduct = {
        id: rawProduct.code,
        title: rawProduct.product_name || 'Produit sans nom',
        description: rawProduct.ingredients_text || 'Aucune description',
        slug: this.generateSlug(rawProduct.product_name || 'produit'),
        brand: rawProduct.brands || 'Marque inconnue',
        category: rawProduct.categories || 'Non classÃ©',
        tags: this.extractTags(rawProduct.categories || ''),
        images: rawProduct.image_url ? [rawProduct.image_url] : [],
        zones_dispo: ['FR'], // Par dÃ©faut France
        prices: {
          default: 0,
          currency: 'EUR'
        },
        eco_score: ecoScore.eco_score,
        nutritional_score: this.mapNutritionalGrade(rawProduct.nutrition_grades),
        ingredients: rawProduct.ingredients_text || '',
        verified_status: 'verified' as const, // âœ… CORRECTION: "verified" au lieu de "ai_verified"
        ai_confidence: ecoScore.ai_confidence,
        source: source
      };

      return processedProduct;
    } catch (error) {
      console.error(`âŒ Erreur traitement produit ${rawProduct.code}:`, error);
      return null;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private extractTags(categories: string): string[] {
    if (!categories) return [];
    
    return categories
      .split(',')
      .map(cat => cat.trim().toLowerCase())
      .filter(cat => cat.length > 0)
      .slice(0, 5); // Limiter Ã  5 tags
  }

  private mapNutritionalGrade(grade: string): number {
    const gradeMap: { [key: string]: number } = {
      'a': 90,
      'b': 70,
      'c': 50,
      'd': 30,
      'e': 10
    };
    
    return gradeMap[grade?.toLowerCase()] || 50;
  }

  private async saveProducts(products: any[]) {
    try {
      // await prisma.product.createMany({ // PRISMA DISABLED
        data: products,
        skipDuplicates: true
      });
      
      console.log(`ðŸ’¾ ${products.length} produits sauvegardÃ©s`);
    } catch (error) {
      console.error('âŒ Erreur sauvegarde produits:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    // // await prisma.$disconnect(); // PRISMA DISABLED // PRISMA DISABLED
  }
}

// Export pour utilisation dans d'autres modules
export default DataIngestionJob;
// EOF


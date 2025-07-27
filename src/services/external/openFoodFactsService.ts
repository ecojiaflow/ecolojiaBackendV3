// PATH: backend/src/services/external/openFoodFactsService.ts
import axios from 'axios';
import { ProductData } from '../ai/barcodeAnalyzer';

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  image_url?: string;
  nutriments?: any;
  categories?: string;
  status: number;
}

export class OpenFoodFactsService {
  private static readonly BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';
  
  static async getProduct(barcode: string): Promise<ProductData | null> {
    try {
      console.log(`ðŸ” Recherche OpenFoodFacts: ${barcode}`);
      
      const response = await axios.get<{ product: OpenFoodFactsProduct; status: number }>(
        `${this.BASE_URL}/${barcode}.json`,
        {
          timeout: 5000,
          headers: {
            'User-Agent': 'ECOLOJIA/1.0 (contact@ecolojia.com)'
          }
        }
      );

      if (response.data.status === 1 && response.data.product) {
        const product = response.data.product;
        
        return {
          barcode,
          name: product.product_name || `Produit ${barcode}`,
          category: 'alimentaire',
          composition: product.ingredients_text || undefined,
          brand: product.brands || undefined,
          image_url: product.image_url || undefined,
          found: true
        };
      }

      console.log(`âŒ Produit non trouvÃ© dans OpenFoodFacts: ${barcode}`);
      return null;

    } catch (error) {
      console.error('Erreur OpenFoodFacts:', error);
      return null;
    }
  }

  static async searchProducts(query: string, limit: number = 20): Promise<ProductData[]> {
    try {
      const response = await axios.get(
        `https://world.openfoodfacts.org/cgi/search.pl`,
        {
          params: {
            search_terms: query,
            json: 1,
            page_size: limit,
            sort_by: 'popularity'
          },
          timeout: 10000
        }
      );

      if (response.data.products) {
        return response.data.products.map((product: any) => ({
          barcode: product.code,
          name: product.product_name || 'Produit sans nom',
          category: 'alimentaire' as const,
          composition: product.ingredients_text,
          brand: product.brands,
          image_url: product.image_url,
          found: true
        }));
      }

      return [];
    } catch (error) {
      console.error('Erreur recherche OpenFoodFacts:', error);
      return [];
    }
  }


}

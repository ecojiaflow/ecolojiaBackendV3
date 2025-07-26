// PATH: backend/src/services/ai/barcodeAnalyzer.ts
import { CategoryDetector } from './categoryDetector';

export interface ProductData {
  barcode: string;
  name: string;
  category: 'alimentaire' | 'cosmetique' | 'detergent';
  ingredients?: string[];
  composition?: string;
  brand?: string;
  image_url?: string;
  found: boolean;
  generic?: boolean;
}

export interface BarcodeAnalysisResult {
  novaGroup?: number;
  riskFactors: string[];
  recommendations: string[];
  score: number;
  confidence: number;
  processingTime: number;
  metadata: {
    method: string;
    barcode: string;
    category: string;
    timestamp: string;
  };
}

export class BarcodeAnalyzer {
  
  static async analyzeProduct(
    productData: ProductData, 
    category: string
  ): Promise<BarcodeAnalysisResult> {
    const startTime = Date.now();
    
    // Pour l'instant, analyse générique pour tous les produits
    return this.getGenericAnalysis(productData, category, startTime);
  }

  private static getGenericAnalysis(productData: ProductData, category: string, startTime: number): BarcodeAnalysisResult {
    const prefix = productData.barcode.substring(0, 2);
    
    let score = 50;
    let riskFactors = ['Produit non trouvé en base de données'];
    let recommendations = ['Vérifiez les informations sur l\'emballage'];
    
    // Estimation basée sur la catégorie
    switch (category) {
      case 'alimentaire':
        const novaGroup = this.estimateNovaFromPrefix(prefix);
        score = (5 - novaGroup) * 20;
        riskFactors = [`Groupe NOVA estimé: ${novaGroup}`];
        recommendations = ['Privilégiez les produits peu transformés'];
        break;
        
      case 'cosmetique':
        score = 60;
        riskFactors = ['Composition INCI non analysée'];
        recommendations = ['Vérifiez la liste des ingrédients'];
        break;
        
      case 'detergent':
        score = 45;
        riskFactors = ['Impact environnemental non évalué'];
        recommendations = ['Choisissez des produits écolabellisés'];
        break;
    }

    return {
      novaGroup: category === 'alimentaire' ? this.estimateNovaFromPrefix(prefix) : undefined,
      riskFactors,
      recommendations,
      score,
      confidence: 0.5,
      processingTime: Date.now() - startTime,
      metadata: {
        method: 'generic_analysis',
        barcode: productData.barcode,
        category,
        timestamp: new Date().toISOString()
      }
    };
  }

  private static estimateNovaFromPrefix(prefix: string): number {
    const industrialPrefixes = ['30', '31', '70', '80'];
    const processedPrefixes = ['32', '33', '50', '60'];
    
    if (industrialPrefixes.includes(prefix)) return 4;
    if (processedPrefixes.includes(prefix)) return 3;
    return 2;
  }

  // Méthodes pour récupérer des produits (retournent null pour l'instant)
  static async getCosmeticProduct(barcode: string): Promise<ProductData | null> {
    console.log(`🔍 Recherche cosmétique: ${barcode}`);
    return null;
  }

  static async getDetergentProduct(barcode: string): Promise<ProductData | null> {
    console.log(`🔍 Recherche détergent: ${barcode}`);
    return null;
  }
}
// PATH: backend/src/scripts/importOpenFoodFactsAdapted.ts
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Configuration adaptée de ton script existant
const CONFIG = {
  OPENFOODFACTS_URL: 'https://world.openfoodfacts.org/cgi/search.pl',
  BATCH_SIZE: 10,
  DELAY_MS: 3000,
  MAX_PRODUCTS: 50, // Pour test, augmenter à 10000+ en production
  LOG_DIR: path.join(__dirname, '../../logs')
};

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  labels?: string;
  ingredients_text?: string;
  nutriments?: any;
  nova_group?: number;
}

interface ImportResults {
  success: number;
  errors: number;
  updated: number;
  total: number;
  startTime: Date;
  endTime?: Date;
}

class OpenFoodFactsImporterV2 {
  private prisma: PrismaClient;
  private results: ImportResults;
  private logFile: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.results = {
      success: 0,
      errors: 0,
      updated: 0,
      total: 0,
      startTime: new Date()
    };
    this.logFile = path.join(CONFIG.LOG_DIR, `import-${Date.now()}.log`);
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(CONFIG.LOG_DIR)) {
      fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    }
  }

  private log(message: string, level: 'INFO' | 'ERROR' | 'SUCCESS' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  // Adaptation de ta fonction fetchOpenFoodFactsProducts
  async fetchOpenFoodFactsProducts(): Promise<OpenFoodFactsProduct[]> {
    try {
      this.log('🔍 Récupération produits OpenFoodFacts...');
      
      const params = {
        search_terms: 'bio organic',
        tagtype_0: 'countries',
        tag_contains_0: 'contains',
        tag_0: 'France',
        sort_by: 'popularity_key',
        page_size: CONFIG.MAX_PRODUCTS,
        json: 1,
        fields: 'code,product_name,brands,categories,image_url,labels,ingredients_text,nutriments,nova_group'
      };

      const response = await axios.get(CONFIG.OPENFOODFACTS_URL, { 
        params,
        timeout: 15000,
        headers: {
          'User-Agent': 'Ecolojia-Backend/2.0'
        }
      });

      const products = response.data.products || [];
      this.log(`✅ ${products.length} produits récupérés`);
      
      return products.filter(p => 
        p.product_name && 
        p.product_name.trim().length > 5 &&
        !p.product_name.toLowerCase().includes('test') &&
        p.code && 
        /^\d{8,13}$/.test(p.code)
      );

    } catch (error) {
      this.log(`❌ Erreur récupération: ${error}`, 'ERROR');
      return [];
    }
  }

  // Adaptation de ta logique de transformation pour Prisma
  private transformForDatabase(product: OpenFoodFactsProduct) {
    return {
      barcode: product.code,
      name: product.product_name?.trim() || `Produit ${product.code}`,
      brand: product.brands ? product.brands.split(',')[0].trim() : null,
      category: this.determineCategory(product.categories || ''),
      ingredients: product.ingredients_text || null,
      nutrition: product.nutriments ? JSON.parse(JSON.stringify(product.nutriments)) : null,
      image_url: product.image_url || null
    };
  }

  private determineCategory(categories: string): string {
    const categoryLower = categories.toLowerCase();
    
    if (categoryLower.includes('cosmetic') || categoryLower.includes('beauty')) {
      return 'cosmetique';
    }
    if (categoryLower.includes('detergent') || categoryLower.includes('cleaning')) {
      return 'detergent';
    }
    return 'alimentaire';
  }

  // Adaptation de ta fonction d'import par lots
  async importProductsBatch(products: OpenFoodFactsProduct[]): Promise<ImportResults> {
    this.log(`🚀 Import ${products.length} produits vers PostgreSQL...`);
    this.log(`⏱️  Délai: ${CONFIG.DELAY_MS}ms entre produits`);
    
    this.results.total = products.length;
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      this.log(`📦 ${i + 1}/${products.length}: ${product.product_name}`);
      
      try {
        await this.importSingleProduct(product);
        
        // Délai respectueux (gardé de ton script original)
        if (i < products.length - 1) {
          await this.sleep(CONFIG.DELAY_MS);
        }
        
      } catch (error) {
        this.log(`💥 Erreur produit ${product.code}: ${error}`, 'ERROR');
        this.results.errors++;
      }
    }
    
    this.results.endTime = new Date();
    return this.results;
  }

  private async importSingleProduct(product: OpenFoodFactsProduct) {
    try {
      // Vérifier si produit existe
      const existingProduct = await this.prisma.product.findUnique({
        where: { barcode: product.code }
      });

      const productData = this.transformForDatabase(product);

      if (existingProduct) {
        // Mise à jour
        await this.prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            ...productData,
            updated_at: new Date()
          }
        });
        this.results.updated++;
        this.log(`   🔄 Mis à jour: ${productData.name.substring(0, 30)}...`);
      } else {
        // Création
        await this.prisma.product.create({
          data: productData
        });
        this.results.success++;
        this.log(`   ✅ Créé: ${productData.name.substring(0, 30)}...`);
      }

      // Créer analyse NOVA si disponible
      if (product.nova_group) {
        await this.createNovaAnalysis(product);
      }

    } catch (error) {
      throw error;
    }
  }

  private async createNovaAnalysis(product: OpenFoodFactsProduct) {
    try {
      const existingAnalysis = await this.prisma.analysis.findFirst({
        where: { barcode: product.code }
      });

      if (!existingAnalysis) {
        await this.prisma.analysis.create({
          data: {
            barcode: product.code,
            category: 'alimentaire',
            nova_group: product.nova_group || 1,
            risk_factors: [],
            score: this.calculateScore(product.nova_group || 1),
            confidence: 0.8,
            metadata: {
              source: 'openfoodfacts_import_v2',
              import_date: new Date().toISOString()
            }
          }
        });
      }
    } catch (error) {
      this.log(`⚠️ Erreur analyse NOVA ${product.code}: ${error}`, 'ERROR');
    }
  }

  private calculateScore(novaGroup: number): number {
    const scores = { 1: 9.0, 2: 7.0, 3: 5.0, 4: 2.0 };
    return scores[novaGroup as keyof typeof scores] || 5.0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Adaptation de ta fonction principale runImport
  async runImport(): Promise<ImportResults> {
    this.log('🚀 IMPORT OPENFOODFACTS → POSTGRESQL');
    this.log(`🎯 Objectif: ${CONFIG.MAX_PRODUCTS} produits max`);
    
    try {
      // 1. Récupération produits (gardé de ton script)
      const products = await this.fetchOpenFoodFactsProducts();
      
      if (products.length === 0) {
        this.log('❌ Aucun produit à importer');
        return this.results;
      }
      
      // 2. Import par lots (adaptée pour Prisma)
      const results = await this.importProductsBatch(products);
      
      // 3. Statistiques finales (gardées de ton script)
      this.log('📊 RÉSULTATS IMPORT:', 'SUCCESS');
      this.log(`✅ Créés: ${results.success}/${results.total}`);
      this.log(`🔄 Mis à jour: ${results.updated}/${results.total}`);
      this.log(`❌ Erreurs: ${results.errors}/${results.total}`);
      this.log(`📈 Taux succès: ${Math.round(((results.success + results.updated) / results.total) * 100)}%`);
      
      // 4. Sauvegarde log (gardée de ton script)
      const logData = {
        timestamp: new Date().toISOString(),
        results: results,
        config: CONFIG
      };
      
      fs.writeFileSync(
        path.join(CONFIG.LOG_DIR, `import-results-${Date.now()}.json`), 
        JSON.stringify(logData, null, 2)
      );
      
      this.log('💾 Log sauvegardé', 'SUCCESS');
      this.log('🔄 Vérification dans Prisma Studio recommandée');
      
      return results;
      
    } catch (error) {
      this.log(`💥 Erreur import: ${error}`, 'ERROR');
      throw error;
    }
  }

  // Test de connexion base de données
  async testDatabaseConnection(): Promise<boolean> {
    this.log('🧪 TEST CONNEXION POSTGRESQL');
    
    try {
      await this.prisma.$connect();
      const productCount = await this.prisma.product.count();
      this.log(`✅ Connexion OK - ${productCount} produits existants`);
      return true;
    } catch (error) {
      this.log(`❌ Connexion échouée: ${error}`, 'ERROR');
      return false;
    }
  }

  async cleanup() {
    await this.prisma.$disconnect();
  }
}

// Menu interactif adapté de ton script
async function main() {
  const args = process.argv.slice(2);
  const importer = new OpenFoodFactsImporterV2();
  
  try {
    if (args.includes('--test')) {
      await importer.testDatabaseConnection();
    } else if (args.includes('--import')) {
      const results = await importer.runImport();
      console.log('\n📊 Import terminé:', results);
    } else {
      console.log('🔧 SCRIPT IMPORT OPENFOODFACTS V2 (POSTGRESQL)');
      console.log('\nCommandes disponibles:');
      console.log('  npm run build && node dist/scripts/importOpenFoodFactsAdapted.js --test     # Test DB');
      console.log('  npm run build && node dist/scripts/importOpenFoodFactsAdapted.js --import   # Import complet');
      console.log('\n⚠️  IMPORTANT: Configurer DATABASE_URL d\'abord!');
    }
  } catch (error) {
    console.error('💥 Erreur:', error);
  } finally {
    await importer.cleanup();
  }
}

// Exécution
if (require.main === module) {
  main().catch(console.error);
}
// EOF
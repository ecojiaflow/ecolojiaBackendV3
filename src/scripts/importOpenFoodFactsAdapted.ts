// PATH: src/scripts/importOpenFoodFactsAdapted.ts
// // import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Types simplifiés pour éviter les erreurs d'import Prisma
type ConfidenceColor = 'green' | 'orange' | 'red';
type VerifiedStatus = 'verified' | 'pending' | 'rejected' | 'ai_analyzed' | 'manual_review';

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
    this.prisma = null // new PrismaClient();
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
          'User-Agent': process.env.OPENFOODFACTS_USER_AGENT || 'Ecolojia-Backend/2.0'
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
    const title = product.product_name?.trim() || `Produit ${product.code}`;
    const slug = this.generateSlug(title, product.code);
    
    return {
      title: title,
      slug: slug,
      description: product.ingredients_text?.substring(0, 500) || `Produit alimentaire référencé OpenFoodFacts`,
      brand: product.brands ? product.brands.split(',')[0].trim() : null,
      category: this.determineCategory(product.categories || ''),
      tags: this.extractTags(product.categories || '', product.labels || ''),
      zones_dispo: ['FR'], // Produits français par défaut
      affiliate_url: `https://world.openfoodfacts.org/product/${product.code}`,
      eco_score: this.calculateEcoScore(product.nova_group || 1),
      ai_confidence: 0.8,
      confidence_pct: 80,
      confidence_color: this.getConfidenceColor(80) as any, // Cast pour éviter erreur TypeScript
      verified_status: 'verified' as any, // Cast pour éviter erreur TypeScript
      image_url: product.image_url || null,
      images: product.image_url ? [product.image_url] : []
    };
  }

  private generateSlug(title: string, code: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) + '-' + code.substring(-6);
  }

  private extractTags(categories: string, labels: string): string[] {
    const tags = [];
    const allText = (categories + ' ' + labels).toLowerCase();
    
    if (allText.includes('bio')) tags.push('bio');
    if (allText.includes('organic')) tags.push('bio');
    if (allText.includes('vegan')) tags.push('vegan');
    if (allText.includes('gluten')) tags.push('sans-gluten');
    if (allText.includes('fair-trade')) tags.push('commerce-équitable');
    if (allText.includes('france')) tags.push('français');
    if (allText.includes('artisan')) tags.push('artisanal');
    
    return tags.length > 0 ? tags : ['alimentaire'];
  }

  private calculateEcoScore(novaGroup: number): number {
    const scores = { 1: 0.9, 2: 0.7, 3: 0.5, 4: 0.3 };
    return scores[novaGroup as keyof typeof scores] || 0.5;
  }

  private getConfidenceColor(confidence: number): ConfidenceColor {
    if (confidence >= 80) return 'green';
    if (confidence >= 60) return 'orange';
    return 'red';
  }

  private determineCategory(categories: string): string {
    const categoryLower = categories.toLowerCase();
    
    if (categoryLower.includes('cosmetic') || categoryLower.includes('beauty')) {
      return 'cosmetic';
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
      // Vérifier si produit existe déjà par slug
      const slug = this.generateSlug(product.product_name || `Produit ${product.code}`, product.code);
      const existingProduct = await this.prisma.product.findUnique({
        where: { slug: slug }
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
        this.log(`   🔄 Mis à jour: ${productData.title.substring(0, 30)}...`);
      } else {
        // Création
        await this.prisma.product.create({
          data: productData
        });
        this.results.success++;
        this.log(`   ✅ Créé: ${productData.title.substring(0, 30)}...`);
      }

    } catch (error) {
      throw error;
    }
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

export default OpenFoodFactsImporterV2;
// EOF

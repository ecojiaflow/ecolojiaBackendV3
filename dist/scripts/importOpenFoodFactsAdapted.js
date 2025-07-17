"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/scripts/importOpenFoodFactsAdapted.ts
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Configuration adaptée de ton script existant
const CONFIG = {
    OPENFOODFACTS_URL: 'https://world.openfoodfacts.org/cgi/search.pl',
    BATCH_SIZE: 10,
    DELAY_MS: 3000,
    MAX_PRODUCTS: 50, // Pour test, augmenter à 10000+ en production
    LOG_DIR: path.join(__dirname, '../../logs')
};
class OpenFoodFactsImporterV2 {
    constructor() {
        this.prisma = new client_1.PrismaClient();
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
    ensureLogDirectory() {
        if (!fs.existsSync(CONFIG.LOG_DIR)) {
            fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
        }
    }
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${level}: ${message}`;
        console.log(logMessage);
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }
    // Adaptation de ta fonction fetchOpenFoodFactsProducts
    async fetchOpenFoodFactsProducts() {
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
            const response = await axios_1.default.get(CONFIG.OPENFOODFACTS_URL, {
                params,
                timeout: 15000,
                headers: {
                    'User-Agent': 'Ecolojia-Backend/2.0'
                }
            });
            const products = response.data.products || [];
            this.log(`✅ ${products.length} produits récupérés`);
            return products.filter(p => p.product_name &&
                p.product_name.trim().length > 5 &&
                !p.product_name.toLowerCase().includes('test') &&
                p.code &&
                /^\d{8,13}$/.test(p.code));
        }
        catch (error) {
            this.log(`❌ Erreur récupération: ${error}`, 'ERROR');
            return [];
        }
    }
    // Adaptation de ta logique de transformation pour Prisma
    transformForDatabase(product) {
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
            confidence_color: this.getConfidenceColor(80),
            verified_status: client_1.VerifiedStatus.verified,
            image_url: product.image_url || null,
            images: product.image_url ? [product.image_url] : []
        };
    }
    generateSlug(title, code) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50) + '-' + code.substring(-6);
    }
    extractTags(categories, labels) {
        const tags = [];
        const allText = (categories + ' ' + labels).toLowerCase();
        if (allText.includes('bio'))
            tags.push('bio');
        if (allText.includes('organic'))
            tags.push('bio');
        if (allText.includes('vegan'))
            tags.push('vegan');
        if (allText.includes('gluten'))
            tags.push('sans-gluten');
        if (allText.includes('fair-trade'))
            tags.push('commerce-équitable');
        return tags.length > 0 ? tags : ['alimentaire'];
    }
    calculateEcoScore(novaGroup) {
        const scores = { 1: 0.9, 2: 0.7, 3: 0.5, 4: 0.3 };
        return scores[novaGroup] || 0.5;
    }
    getConfidenceColor(confidence) {
        if (confidence >= 80)
            return client_1.ConfidenceColor.green;
        if (confidence >= 60)
            return client_1.ConfidenceColor.orange;
        return client_1.ConfidenceColor.red;
    }
    determineCategory(categories) {
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
    async importProductsBatch(products) {
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
            }
            catch (error) {
                this.log(`💥 Erreur produit ${product.code}: ${error}`, 'ERROR');
                this.results.errors++;
            }
        }
        this.results.endTime = new Date();
        return this.results;
    }
    async importSingleProduct(product) {
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
            }
            else {
                // Création
                await this.prisma.product.create({
                    data: productData
                });
                this.results.success++;
                this.log(`   ✅ Créé: ${productData.title.substring(0, 30)}...`);
            }
            // Note: Pas de table analysis dans ton schéma, on skip cette partie
        }
        catch (error) {
            throw error;
        }
    }
    async createNovaAnalysis(product) {
        // Table analysis n'existe pas dans ton schéma Prisma
        // Cette fonction est désactivée pour éviter les erreurs
        this.log(`   📊 Analyse NOVA ${product.nova_group || 1} pour ${product.code} (pas de table analysis)`);
    }
    calculateScore(novaGroup) {
        // Fonction gardée pour compatibilité mais pas utilisée car pas de table analysis
        const scores = { 1: 9.0, 2: 7.0, 3: 5.0, 4: 2.0 };
        return scores[novaGroup] || 5.0;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Adaptation de ta fonction principale runImport
    async runImport() {
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
            fs.writeFileSync(path.join(CONFIG.LOG_DIR, `import-results-${Date.now()}.json`), JSON.stringify(logData, null, 2));
            this.log('💾 Log sauvegardé', 'SUCCESS');
            this.log('🔄 Vérification dans Prisma Studio recommandée');
            return results;
        }
        catch (error) {
            this.log(`💥 Erreur import: ${error}`, 'ERROR');
            throw error;
        }
    }
    // Test de connexion base de données
    async testDatabaseConnection() {
        this.log('🧪 TEST CONNEXION POSTGRESQL');
        try {
            await this.prisma.$connect();
            const productCount = await this.prisma.product.count();
            this.log(`✅ Connexion OK - ${productCount} produits existants`);
            return true;
        }
        catch (error) {
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
        }
        else if (args.includes('--import')) {
            const results = await importer.runImport();
            console.log('\n📊 Import terminé:', results);
        }
        else {
            console.log('🔧 SCRIPT IMPORT OPENFOODFACTS V2 (POSTGRESQL)');
            console.log('\nCommandes disponibles:');
            console.log('  npm run build && node dist/scripts/importOpenFoodFactsAdapted.js --test     # Test DB');
            console.log('  npm run build && node dist/scripts/importOpenFoodFactsAdapted.js --import   # Import complet');
            console.log('\n⚠️  IMPORTANT: Configurer DATABASE_URL d\'abord!');
        }
    }
    catch (error) {
        console.error('💥 Erreur:', error);
    }
    finally {
        await importer.cleanup();
    }
}
// Exécution
if (require.main === module) {
    main().catch(console.error);
}
// EOF

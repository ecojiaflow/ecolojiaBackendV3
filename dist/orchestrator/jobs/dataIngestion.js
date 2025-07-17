"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngestionJob = void 0;
// PATH: backend/src/orchestrator/jobs/dataIngestion.ts
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
class DataIngestionJob {
    constructor() {
        this.BATCH_SIZE = 100;
        this.RATE_LIMIT_DELAY = 1000; // 1 seconde entre les batches
    }
    async ingestProducts(source = 'openfoodfacts') {
        console.log(`🔄 Début ingestion données depuis ${source}`);
        try {
            const products = await this.fetchProductsFromSource(source);
            console.log(`📦 ${products.length} produits récupérés`);
            await this.processBatches(products, source);
            console.log(`✅ Ingestion terminée pour ${source}`);
        }
        catch (error) {
            console.error(`❌ Erreur ingestion ${source}:`, error);
            throw error;
        }
    }
    async fetchProductsFromSource(source) {
        switch (source) {
            case 'openfoodfacts':
                return await this.fetchFromOpenFoodFacts();
            case 'mock':
                return this.generateMockProducts();
            default:
                throw new Error(`Source non supportée: ${source}`);
        }
    }
    async fetchFromOpenFoodFacts() {
        const response = await axios_1.default.get('https://world.openfoodfacts.org/cgi/search.pl', {
            params: {
                action: 'process',
                json: 1,
                page_size: this.BATCH_SIZE,
                fields: 'code,product_name,brands,categories,ingredients_text,image_url,nutrition_grades'
            }
        });
        return response.data.products || [];
    }
    generateMockProducts() {
        return [
            {
                code: '3017620422003',
                product_name: 'Nutella',
                brands: 'Ferrero',
                categories: 'Pâtes à tartiner',
                ingredients_text: 'Sucre, huile de palme, noisettes, cacao, lait écrémé',
                image_url: 'https://example.com/nutella.jpg',
                nutrition_grades: 'e'
            },
            {
                code: '8712566176434',
                product_name: 'Coca-Cola',
                brands: 'Coca-Cola',
                categories: 'Boissons gazeuses',
                ingredients_text: 'Eau, sucre, dioxyde de carbone, colorant caramel, arôme',
                image_url: 'https://example.com/coca.jpg',
                nutrition_grades: 'e'
            }
        ];
    }
    async processBatches(products, source) {
        const batches = this.createBatches(products, this.BATCH_SIZE);
        for (let i = 0; i < batches.length; i++) {
            console.log(`📦 Traitement batch ${i + 1}/${batches.length}`);
            await this.processBatch(batches[i], source);
            // Rate limiting
            if (i < batches.length - 1) {
                await this.delay(this.RATE_LIMIT_DELAY);
            }
        }
    }
    createBatches(array, size) {
        const batches = [];
        for (let i = 0; i < array.length; i += size) {
            batches.push(array.slice(i, i + size));
        }
        return batches;
    }
    async processBatch(products, source) {
        const processedProducts = await Promise.all(products.map(product => this.processProduct(product, source)));
        // Filtrer les produits valides
        const validProducts = processedProducts.filter(p => p !== null);
        if (validProducts.length > 0) {
            await this.saveProducts(validProducts);
        }
    }
    async processProduct(rawProduct, source) {
        try {
            // Calculer eco-score simplifié
            const ecoScore = {
                eco_score: 50,
                ai_confidence: 0.7
            };
            // ✅ CORRECTION: Utiliser "verified" au lieu de "ai_verified"
            const processedProduct = {
                id: rawProduct.code,
                title: rawProduct.product_name || 'Produit sans nom',
                description: rawProduct.ingredients_text || 'Aucune description',
                slug: this.generateSlug(rawProduct.product_name || 'produit'),
                brand: rawProduct.brands || 'Marque inconnue',
                category: rawProduct.categories || 'Non classé',
                tags: this.extractTags(rawProduct.categories || ''),
                images: rawProduct.image_url ? [rawProduct.image_url] : [],
                zones_dispo: ['FR'], // Par défaut France
                prices: {
                    default: 0,
                    currency: 'EUR'
                },
                eco_score: ecoScore.eco_score,
                nutritional_score: this.mapNutritionalGrade(rawProduct.nutrition_grades),
                ingredients: rawProduct.ingredients_text || '',
                verified_status: 'verified', // ✅ CORRECTION: "verified" au lieu de "ai_verified"
                ai_confidence: ecoScore.ai_confidence,
                source: source
            };
            return processedProduct;
        }
        catch (error) {
            console.error(`❌ Erreur traitement produit ${rawProduct.code}:`, error);
            return null;
        }
    }
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    extractTags(categories) {
        if (!categories)
            return [];
        return categories
            .split(',')
            .map(cat => cat.trim().toLowerCase())
            .filter(cat => cat.length > 0)
            .slice(0, 5); // Limiter à 5 tags
    }
    mapNutritionalGrade(grade) {
        const gradeMap = {
            'a': 90,
            'b': 70,
            'c': 50,
            'd': 30,
            'e': 10
        };
        return gradeMap[grade?.toLowerCase()] || 50;
    }
    async saveProducts(products) {
        try {
            await prisma.product.createMany({
                data: products,
                skipDuplicates: true
            });
            console.log(`💾 ${products.length} produits sauvegardés`);
        }
        catch (error) {
            console.error('❌ Erreur sauvegarde produits:', error);
            throw error;
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async cleanup() {
        await prisma.$disconnect();
    }
}
exports.DataIngestionJob = DataIngestionJob;
// Export pour utilisation dans d'autres modules
exports.default = DataIngestionJob;
// EOF

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
// PATH: backend/src/services/product.service.ts
const client_1 = require("@prisma/client");
const eco_score_service_1 = require("./eco-score.service");
const prisma = new client_1.PrismaClient();
class ProductService {
    constructor() {
        this.ecoScoreService = new eco_score_service_1.EcoScoreService();
    }
    async analyzeProductFromText(text) {
        try {
            console.log('🔍 Analyse produit depuis texte:', text);
            // Extraction des informations depuis le texte
            const productInfo = this.extractProductInfo(text);
            // ✅ CORRECTION: Utiliser la méthode qui existe
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
        }
        catch (error) {
            console.error('❌ Erreur analyse texte:', error);
            throw error;
        }
    }
    extractProductInfo(text) {
        // Logique simplifiée d'extraction
        const lines = text.split('\n').filter(line => line.trim());
        let title = 'Produit analysé';
        let ingredients = '';
        let category = 'Non classé';
        // Tentative d'extraction du titre (première ligne non vide)
        if (lines.length > 0) {
            title = lines[0].trim();
        }
        // Recherche des ingrédients
        const ingredientsLine = lines.find(line => line.toLowerCase().includes('ingrédients') ||
            line.toLowerCase().includes('composition') ||
            line.includes('E') ||
            line.includes('%'));
        if (ingredientsLine) {
            ingredients = ingredientsLine.replace(/^[^:]*:/, '').trim();
        }
        // Détection de catégorie basique
        const textLower = text.toLowerCase();
        if (textLower.includes('cosmétique') || textLower.includes('crème') || textLower.includes('shampoing')) {
            category = 'cosmétique';
        }
        else if (textLower.includes('détergent') || textLower.includes('lessive') || textLower.includes('nettoyant')) {
            category = 'détergent';
        }
        else if (textLower.includes('alimentaire') || textLower.includes('food') || textLower.includes('nutrition')) {
            category = 'alimentaire';
        }
        return {
            title,
            ingredients,
            category,
            extractedText: text
        };
    }
    async searchProducts(query, category, limit = 20) {
        try {
            const whereClause = {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { brand: { contains: query, mode: 'insensitive' } }
                ]
            };
            if (category) {
                whereClause.category = { contains: category, mode: 'insensitive' };
            }
            const products = await prisma.product.findMany({
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
        }
        catch (error) {
            console.error('❌ Erreur recherche produits:', error);
            throw error;
        }
    }
    async getProductById(id) {
        try {
            const product = await prisma.product.findUnique({
                where: { id }
                // ✅ CORRECTION: supprimer _count qui n'existe pas
            });
            if (!product) {
                return { success: false, error: 'Produit non trouvé' };
            }
            return {
                success: true,
                product
            };
        }
        catch (error) {
            console.error('❌ Erreur récupération produit:', error);
            throw error;
        }
    }
    async updateProductScore(id) {
        try {
            const product = await prisma.product.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    description: true, // ✅ CORRECTION: utiliser description
                    category: true
                }
            });
            if (!product) {
                return { success: false, error: 'Produit non trouvé' };
            }
            const newScore = await this.ecoScoreService.calculate({
                id: product.id,
                title: product.title,
                ingredients: product.description || '', // ✅ CORRECTION: utiliser description
                category: product.category || ''
            });
            await this.ecoScoreService.saveScoreToDatabase(id, newScore);
            return {
                success: true,
                message: 'Score mis à jour',
                score: newScore
            };
        }
        catch (error) {
            console.error('❌ Erreur mise à jour score:', error);
            throw error;
        }
    }
    async getProductsByCategory(category, limit = 50) {
        try {
            const products = await prisma.product.findMany({
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
        }
        catch (error) {
            console.error('❌ Erreur produits par catégorie:', error);
            throw error;
        }
    }
    async getTopProducts(limit = 10) {
        try {
            const products = await prisma.product.findMany({
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
        }
        catch (error) {
            console.error('❌ Erreur top produits:', error);
            throw error;
        }
    }
    async getProductStats() {
        try {
            const totalProducts = await prisma.product.count();
            const verifiedProducts = await prisma.product.count({
                where: { verified_status: 'verified' }
            });
            const avgScore = await prisma.product.aggregate({
                _avg: { eco_score: true }
            });
            const categoryStats = await prisma.product.groupBy({
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
        }
        catch (error) {
            console.error('❌ Erreur statistiques produits:', error);
            throw error;
        }
    }
    async cleanup() {
        await prisma.$disconnect();
    }
}
exports.ProductService = ProductService;
exports.default = ProductService;
// EOF

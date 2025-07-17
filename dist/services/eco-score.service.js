"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcoScoreService = void 0;
// PATH: backend/src/services/eco-score.service.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EcoScoreService {
    constructor() {
        this.SCORE_WEIGHTS = {
            ingredients: 0.4,
            packaging: 0.2,
            transport: 0.2,
            processing: 0.2
        };
    }
    async calculate(input) {
        try {
            console.log(`🌱 Calcul eco-score pour: ${input.title}`);
            // Calculer chaque composant du score
            const ingredientsScore = this.calculateIngredientsScore(input.ingredients || '');
            const packagingScore = this.calculatePackagingScore(input.packaging || '');
            const transportScore = this.calculateTransportScore(input.origin || '');
            const processingScore = this.calculateProcessingScore(input.category || '');
            // Score global pondéré
            const ecoScore = Math.round(ingredientsScore * this.SCORE_WEIGHTS.ingredients +
                packagingScore * this.SCORE_WEIGHTS.packaging +
                transportScore * this.SCORE_WEIGHTS.transport +
                processingScore * this.SCORE_WEIGHTS.processing);
            // Calcul confiance
            const confidence = this.calculateConfidence(input);
            // Génération recommandations
            const recommendations = this.generateRecommendations(input, {
                ingredients: ingredientsScore,
                packaging: packagingScore,
                transport: transportScore,
                processing: processingScore
            });
            const result = {
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
                    'Base de données ADEME 2024',
                    'Coefficients transport CITEPA',
                    'Analyse cycle de vie produits alimentaires'
                ]
            };
            console.log(`✅ Eco-score calculé: ${result.eco_score}/100`);
            return result;
        }
        catch (error) {
            console.error('❌ Erreur calcul eco-score:', error);
            throw error;
        }
    }
    calculateIngredientsScore(ingredients) {
        if (!ingredients)
            return 50;
        const ingredientsList = ingredients.toLowerCase().split(',').map(i => i.trim());
        let score = 70; // Score de base
        // Pénalités ingrédients problématiques
        const problematicIngredients = [
            { name: 'huile de palme', penalty: -20 },
            { name: 'glucose-fructose', penalty: -15 },
            { name: 'sirop de glucose', penalty: -10 },
            { name: 'conservateurs', penalty: -5 },
            { name: 'colorants', penalty: -5 },
            { name: 'arômes artificiels', penalty: -5 }
        ];
        problematicIngredients.forEach(problematic => {
            if (ingredientsList.some(ing => ing.includes(problematic.name))) {
                score += problematic.penalty;
            }
        });
        // Bonus ingrédients naturels
        const naturalIngredients = [
            { name: 'bio', bonus: 10 },
            { name: 'local', bonus: 5 },
            { name: 'équitable', bonus: 5 },
            { name: 'naturel', bonus: 5 }
        ];
        naturalIngredients.forEach(natural => {
            if (ingredientsList.some(ing => ing.includes(natural.name))) {
                score += natural.bonus;
            }
        });
        return Math.max(0, Math.min(100, score));
    }
    calculatePackagingScore(packaging) {
        if (!packaging)
            return 60;
        const packagingLower = packaging.toLowerCase();
        // Scores par type d'emballage
        const packagingScores = {
            'verre': 90,
            'carton': 80,
            'métal': 75,
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
        return 50; // Score par défaut
    }
    calculateTransportScore(origin) {
        if (!origin)
            return 60;
        const originLower = origin.toLowerCase();
        // Scores par zone géographique (perspective France)
        const regionScores = {
            'local': 95,
            'france': 85,
            'europe': 70,
            'afrique du nord': 60,
            'amérique du nord': 40,
            'amérique du sud': 30,
            'asie': 25,
            'océanie': 20
        };
        for (const [region, score] of Object.entries(regionScores)) {
            if (originLower.includes(region)) {
                return score;
            }
        }
        return 50; // Score par défaut
    }
    calculateProcessingScore(category) {
        if (!category)
            return 60;
        const categoryLower = category.toLowerCase();
        // Scores par niveau de transformation
        const processingScores = {
            'fruits et légumes frais': 95,
            'légumineuses': 90,
            'céréales': 85,
            'produits laitiers': 70,
            'viandes': 65,
            'conserves': 60,
            'surgelés': 65,
            'plats préparés': 40,
            'biscuits': 35,
            'sodas': 25,
            'confiseries': 20
        };
        for (const [type, score] of Object.entries(processingScores)) {
            if (categoryLower.includes(type)) {
                return score;
            }
        }
        return 50; // Score par défaut
    }
    calculateConfidence(input) {
        let confidence = 0.6; // Base
        // Facteurs augmentant la confiance
        if (input.ingredients && input.ingredients.length > 10)
            confidence += 0.1;
        if (input.category && input.category.length > 0)
            confidence += 0.1;
        if (input.brand && input.brand.length > 0)
            confidence += 0.05;
        if (input.packaging && input.packaging.length > 0)
            confidence += 0.1;
        if (input.origin && input.origin.length > 0)
            confidence += 0.1;
        return Math.min(0.95, confidence);
    }
    generateRecommendations(input, breakdown) {
        const recommendations = [];
        // Recommandations basées sur les scores
        if (breakdown.ingredients < 60) {
            recommendations.push('Privilégier des produits avec moins d\'additifs');
        }
        if (breakdown.packaging < 60) {
            recommendations.push('Choisir des emballages recyclables ou réutilisables');
        }
        if (breakdown.transport < 60) {
            recommendations.push('Favoriser les produits locaux ou de saison');
        }
        if (breakdown.processing < 60) {
            recommendations.push('Opter pour des aliments moins transformés');
        }
        // Recommandations générales
        if (recommendations.length === 0) {
            recommendations.push('Produit avec un bon impact environnemental');
        }
        return recommendations;
    }
    async batchCalculate(inputs) {
        const results = await Promise.all(inputs.map(input => this.calculate(input)));
        return results;
    }
    async saveScoreToDatabase(productId, score) {
        try {
            await prisma.product.update({
                where: { id: productId },
                data: {
                    eco_score: score.eco_score,
                    ai_confidence: score.ai_confidence,
                    // ✅ CORRECTION: Utiliser string au lieu de ConfidenceColor enum
                    confidence_color: this.getConfidenceColor(score.ai_confidence),
                    updated_at: new Date()
                }
            });
        }
        catch (error) {
            console.error('❌ Erreur sauvegarde score:', error);
            throw error;
        }
    }
    getConfidenceColor(confidence) {
        // ✅ CORRECTION: Retourner objet compatible avec Prisma
        if (confidence >= 0.8)
            return { set: 'green' };
        if (confidence >= 0.6)
            return { set: 'yellow' };
        return { set: 'red' };
    }
    async getProductScore(productId) {
        try {
            const product = await prisma.product.findUnique({
                where: { id: productId },
                select: {
                    eco_score: true,
                    ai_confidence: true,
                    title: true,
                    description: true, // ✅ CORRECTION: utiliser description
                    category: true
                }
            });
            if (!product)
                return null;
            // Si pas de score calculé, le calculer
            if (!product.eco_score) {
                return await this.calculate({
                    id: productId,
                    title: product.title,
                    ingredients: product.description || '', // ✅ CORRECTION: utiliser description
                    category: product.category || ''
                });
            }
            // Retourner le score existant
            return {
                eco_score: Number(product.eco_score), // ✅ CORRECTION: convertir Decimal en number
                ai_confidence: Number(product.ai_confidence || 0.7), // ✅ CORRECTION: convertir Decimal
                breakdown: {
                    ingredients: 0,
                    packaging: 0,
                    transport: 0,
                    processing: 0
                },
                recommendations: [],
                sources: ['Base de données ADEME 2024']
            };
        }
        catch (error) {
            console.error('❌ Erreur récupération score:', error);
            return null;
        }
    }
    async updateScoresForCategory(category) {
        try {
            const products = await prisma.product.findMany({
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
                    description: true, // ✅ CORRECTION: utiliser description
                    category: true
                }
            });
            console.log(`🔄 Mise à jour scores pour ${products.length} produits`);
            let updatedCount = 0;
            for (const product of products) {
                try {
                    const score = await this.calculate({
                        id: product.id,
                        title: product.title,
                        ingredients: product.description || '', // ✅ CORRECTION: utiliser description
                        category: product.category || ''
                    });
                    await this.saveScoreToDatabase(product.id, score);
                    updatedCount++;
                }
                catch (error) {
                    console.error(`❌ Erreur produit ${product.id}:`, error);
                }
            }
            console.log(`✅ ${updatedCount} scores mis à jour`);
            return updatedCount;
        }
        catch (error) {
            console.error('❌ Erreur mise à jour catégorie:', error);
            return 0;
        }
    }
    async getScoreDistribution() {
        try {
            const distribution = await prisma.product.groupBy({
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
        }
        catch (error) {
            console.error('❌ Erreur distribution scores:', error);
            return [];
        }
    }
    async cleanup() {
        await prisma.$disconnect();
    }
}
exports.EcoScoreService = EcoScoreService;
// Export pour utilisation dans d'autres modules
exports.default = EcoScoreService;
// EOF

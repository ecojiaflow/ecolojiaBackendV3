"use strict";
// backend/src/controllers/products.controller.ts - Version Révolutionnaire
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductStats = exports.searchProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductBySlug = exports.getAllProducts = exports.analyzeProductRevolutionary = void 0;
const prisma_1 = require("../lib/prisma");
// 🆕 IMPORTS MOTEURS IA RÉVOLUTIONNAIRES
const novaClassifier_1 = require("../services/ai/novaClassifier");
const efsaAdditivesDatabase_1 = require("../data/efsaAdditivesDatabase");
const educationalInsights_1 = require("../services/ai/educationalInsights");
const deepseekEnhanced_1 = require("../services/ai/deepseekEnhanced");
const naturalAlternativesEngine_1 = require("../services/ai/naturalAlternativesEngine");
// 🆕 CLASSE ENHANCED PRODUCTS CONTROLLER
class EnhancedProductsController {
    constructor() {
        /**
         * 🔬 ANALYSE SCIENTIFIQUE RÉVOLUTIONNAIRE
         * Endpoint principal pour l'analyse IA avancée
         */
        this.analyzeProductRevolutionary = async (req, res) => {
            try {
                const { barcode, ocrText, images, userProfile, specificQuestions } = req.body;
                console.log('🚀 Début analyse scientifique révolutionnaire...');
                // 1. ANALYSE OCR DE BASE (à adapter selon votre implémentation actuelle)
                const baseAnalysis = await this.performOCRAnalysis(ocrText, images);
                // 2. 🆕 CLASSIFICATION NOVA AUTOMATIQUE
                console.log('🔬 Classification NOVA en cours...');
                const novaAnalysis = this.novaClassifier.classifyProduct({
                    ingredients: baseAnalysis.ingredients,
                    name: baseAnalysis.productName
                });
                // 3. 🆕 ANALYSE ADDITIFS EFSA ENRICHIE
                console.log('🧪 Analyse additifs EFSA...');
                const additivesAnalysis = this.efsaDatabase.analyzeAdditives(baseAnalysis.eCodes || []);
                // 4. 🆕 GÉNÉRATION ALTERNATIVES NATURELLES
                console.log('🌱 Recherche alternatives naturelles...');
                const alternativesData = await this.alternativesEngine.getAlternativesForProduct({
                    name: baseAnalysis.productName,
                    category: baseAnalysis.category,
                    ingredients: baseAnalysis.ingredients,
                    breakdown: {
                        transformation: { novaGroup: novaAnalysis.novaGroup },
                        additives: additivesAnalysis
                    }
                }, userProfile);
                // 5. 🆕 INSIGHTS ÉDUCATIFS AVEC SOURCES
                console.log('📚 Génération insights éducatifs...');
                const educationalContent = this.insightsEngine.generateInsights({
                    novaGroup: novaAnalysis.novaGroup,
                    additives: baseAnalysis.eCodes,
                    ingredients: baseAnalysis.ingredients,
                    category: baseAnalysis.category,
                    glycemicIndex: baseAnalysis.glycemicIndex || 50
                }, userProfile);
                // 6. 🆕 SCORING HOLISTIQUE RÉVOLUTIONNAIRE
                console.log('📊 Calcul score holistique...');
                const revolutionaryScore = this.calculateRevolutionaryScore({
                    baseScore: baseAnalysis.score || 70,
                    novaGroup: novaAnalysis.novaGroup,
                    additivesAnalysis,
                    alternativesQuality: alternativesData.length
                });
                // 7. 🆕 ANALYSE DEEPSEEK ENRICHIE (si nécessaire)
                let aiEnhancement = null;
                if (this.needsDeepSeekAnalysis(novaAnalysis, additivesAnalysis) || specificQuestions) {
                    console.log('🤖 Analyse DeepSeek pour cas complexe...');
                    aiEnhancement = await this.deepseekEnhanced.enhanceAnalysis({
                        productName: baseAnalysis.productName,
                        ingredients: baseAnalysis.ingredients,
                        novaGroup: novaAnalysis.novaGroup,
                        additives: baseAnalysis.eCodes,
                        userQuery: specificQuestions
                    });
                }
                // 8. 🆕 SAUVEGARDE EN BASE (optionnel)
                if (barcode && !await this.productExistsInDB(barcode)) {
                    await this.saveAnalysisToDatabase({
                        barcode,
                        analysis: baseAnalysis,
                        scientificData: { novaAnalysis, additivesAnalysis },
                        score: revolutionaryScore
                    });
                }
                // 9. ASSEMBLAGE RÉPONSE RÉVOLUTIONNAIRE
                const revolutionaryResponse = {
                    // Données de base
                    productName: baseAnalysis.productName,
                    barcode,
                    category: baseAnalysis.category,
                    // 🆕 SCORE RÉVOLUTIONNAIRE
                    score: revolutionaryScore,
                    confidence: this.calculateOverallConfidence([
                        novaAnalysis.confidence,
                        additivesAnalysis.confidence || 0.8,
                        0.9 // Confidence alternatives
                    ]),
                    // 🆕 ANALYSE SCIENTIFIQUE DÉTAILLÉE
                    scientificAnalysis: {
                        nova: novaAnalysis,
                        additives: additivesAnalysis,
                        ingredients: baseAnalysis.ingredients,
                        eCodes: baseAnalysis.eCodes
                    },
                    // 🆕 ALTERNATIVES RÉVOLUTIONNAIRES
                    alternatives: {
                        natural: alternativesData,
                        count: alternativesData.length,
                        topRecommendation: alternativesData[0] || null
                    },
                    // 🆕 CONTENU ÉDUCATIF
                    education: {
                        insights: educationalContent.insights,
                        microLearning: educationalContent.microLearning,
                        sources: educationalContent.scientificSources,
                        takeHomeMessage: educationalContent.takeHomeMessage
                    },
                    // 🆕 ALERTES ET RECOMMANDATIONS
                    alerts: this.generateSmartAlerts(novaAnalysis, additivesAnalysis),
                    recommendations: this.generateActionableRecommendations(novaAnalysis, alternativesData, userProfile),
                    // Enrichissement IA si disponible
                    aiEnhancement,
                    // Métadonnées
                    metadata: {
                        analysisVersion: '2.0-revolutionary',
                        timestamp: new Date().toISOString(),
                        sources: [
                            'Classification NOVA - INSERM 2024',
                            'EFSA Additives Database 2024',
                            'Scientific Literature 2020-2024'
                        ],
                        processingTime: Date.now() - req.body.startTime || 0
                    }
                };
                console.log('✅ Analyse révolutionnaire terminée !');
                res.json({
                    success: true,
                    data: revolutionaryResponse
                });
            }
            catch (error) {
                console.error('❌ Erreur analyse révolutionnaire:', error);
                // Fallback gracieux
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de l\'analyse révolutionnaire',
                    fallback: await this.generateFallbackAnalysis(req.body)
                });
            }
        };
        this.novaClassifier = new novaClassifier_1.NovaClassifier();
        this.efsaDatabase = new efsaAdditivesDatabase_1.EFSAAdditivesDatabase();
        this.insightsEngine = new educationalInsights_1.EducationalInsightsEngine();
        this.deepseekEnhanced = new deepseekEnhanced_1.DeepSeekEnhanced();
        this.alternativesEngine = new naturalAlternativesEngine_1.NaturalAlternativesEngine();
    }
    /**
     * 🆕 CALCUL SCORE HOLISTIQUE RÉVOLUTIONNAIRE
     */
    calculateRevolutionaryScore({ baseScore, novaGroup, additivesAnalysis, alternativesQuality }) {
        let revolutionaryScore = baseScore;
        // PÉNALITÉS RÉVOLUTIONNAIRES
        const novaPenalty = novaGroup === 4 ? -30 : novaGroup === 3 ? -15 : 0;
        const additivesPenalty = additivesAnalysis.overallRisk === 'high' ? -25 :
            additivesAnalysis.overallRisk === 'medium' ? -10 : 0;
        const microbiomePenalty = -(additivesAnalysis.microbiomeDisruptors?.length || 0) * 8;
        const endocrinePenalty = -(additivesAnalysis.endocrineDisruptors?.length || 0) * 15;
        // BONUS RÉVOLUTIONNAIRES
        const alternativesBonus = alternativesQuality * 2;
        const naturalBonus = novaGroup === 1 ? 10 : 0;
        // Application des modifications
        revolutionaryScore += novaPenalty + additivesPenalty + microbiomePenalty + endocrinePenalty + alternativesBonus + naturalBonus;
        const finalScore = Math.max(0, Math.min(100, revolutionaryScore));
        return {
            overall: finalScore,
            breakdown: {
                base: baseScore,
                novaPenalty,
                additivesPenalty,
                microbiomePenalty,
                endocrinePenalty,
                alternativesBonus,
                naturalBonus
            },
            category: this.categorizeScore(finalScore),
            comparison: {
                vsYuka: this.compareWithYuka(finalScore, baseScore),
                vsNutriScore: this.compareWithNutriScore(finalScore)
            }
        };
    }
    /**
     * 🆕 GÉNÉRATION ALERTES INTELLIGENTES
     */
    generateSmartAlerts(novaAnalysis, additivesAnalysis) {
        const alerts = [];
        if (novaAnalysis.novaGroup === 4) {
            alerts.push({
                type: 'ultra_processing',
                severity: 'high',
                title: '🚨 Produit ultra-transformé détecté',
                message: 'Malgré d\'éventuels labels bio/naturel, ce produit subit une transformation industrielle intensive.',
                healthImpact: '+22% risque dépression, +53% risque diabète selon études 2024',
                action: 'Remplacer par alternative naturelle prioritairement'
            });
        }
        if (additivesAnalysis.overallRisk === 'high') {
            alerts.push({
                type: 'high_risk_additives',
                severity: 'high',
                title: '⚠️ Additifs à risque élevé détectés',
                message: `${additivesAnalysis.byRiskLevel.high} additif(s) classé(s) risque élevé par l'EFSA`,
                healthImpact: 'Risques cardiovasculaires et cancérigènes potentiels',
                action: 'Éviter ce produit ou consommer très occasionnellement'
            });
        }
        if ((additivesAnalysis.microbiomeDisruptors?.length || 0) > 0) {
            alerts.push({
                type: 'microbiome_disruptors',
                severity: 'medium',
                title: '🦠 Impact microbiote intestinal',
                message: `Émulsifiants détectés : perturbation possible de votre écosystème intestinal`,
                healthImpact: 'Inflammation intestinale, dysbiose en 2-4 semaines',
                action: 'Privilégier produits sans émulsifiants'
            });
        }
        return alerts;
    }
    /**
     * 🆕 GÉNÉRATION RECOMMANDATIONS ACTIONNABLES
     */
    generateActionableRecommendations(novaAnalysis, alternativesData, userProfile) {
        const recommendations = [];
        if (novaAnalysis.novaGroup === 4) {
            recommendations.push({
                priority: 'high',
                category: 'replacement',
                title: 'Remplacer par alternative naturelle',
                action: alternativesData[0]?.name || 'Version fait maison',
                benefit: alternativesData[0]?.why_better || 'Élimination ultra-transformation',
                timeline: 'Cette semaine',
                difficulty: alternativesData[0]?.difficulty || 'moyen'
            });
        }
        if (alternativesData.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'transition',
                title: 'Plan de transition progressive',
                action: 'Changement graduel sur 3-4 semaines',
                benefit: 'Adoption durable sans frustration',
                timeline: '1 mois',
                difficulty: 'facile'
            });
        }
        recommendations.push({
            priority: 'info',
            category: 'education',
            title: 'Apprendre à décoder les étiquettes',
            action: 'Règle simple : moins de 5 ingrédients reconnaissables',
            benefit: 'Autonomie totale pour futurs achats',
            timeline: 'En continu',
            difficulty: 'facile'
        });
        return recommendations;
    }
    /**
     * MÉTHODES UTILITAIRES
     */
    categorizeScore(score) {
        if (score >= 80)
            return { level: 'excellent', color: 'green', message: 'Excellent choix !' };
        if (score >= 60)
            return { level: 'good', color: 'light-green', message: 'Bon choix' };
        if (score >= 40)
            return { level: 'moderate', color: 'orange', message: 'Acceptable occasionnellement' };
        return { level: 'poor', color: 'red', message: 'À éviter ou remplacer' };
    }
    compareWithYuka(ecoloJiaScore, baseScore) {
        const difference = ecoloJiaScore - baseScore;
        if (Math.abs(difference) < 5) {
            return { difference: 0, message: 'Score similaire à Yuka' };
        }
        else if (difference > 0) {
            return {
                difference: Math.round(difference),
                message: `+${Math.round(difference)} points vs Yuka (analyse plus indulgente)`
            };
        }
        else {
            return {
                difference: Math.round(difference),
                message: `${Math.round(difference)} points vs Yuka (détection ultra-transformation)`
            };
        }
    }
    compareWithNutriScore(score) {
        if (score >= 80)
            return { equivalent: 'A', message: 'Équivalent Nutri-Score A' };
        if (score >= 60)
            return { equivalent: 'B', message: 'Équivalent Nutri-Score B' };
        if (score >= 40)
            return { equivalent: 'C', message: 'Équivalent Nutri-Score C' };
        if (score >= 20)
            return { equivalent: 'D', message: 'Équivalent Nutri-Score D' };
        return { equivalent: 'E', message: 'Équivalent Nutri-Score E' };
    }
    needsDeepSeekAnalysis(novaAnalysis, additivesAnalysis) {
        return (novaAnalysis.confidence < 0.8 ||
            (additivesAnalysis.byRiskLevel?.unknown || 0) > 2 ||
            additivesAnalysis.overallRisk === 'high');
    }
    calculateOverallConfidence(confidenceScores) {
        const validScores = confidenceScores.filter(score => score && score > 0);
        if (validScores.length === 0)
            return 0.7;
        const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
        return Math.round(average * 100) / 100;
    }
    /**
     * MÉTHODES À IMPLÉMENTER SELON VOTRE ARCHITECTURE
     */
    async performOCRAnalysis(ocrText, images) {
        // TODO: Intégrer votre logique OCR existante
        return {
            productName: "Produit détecté",
            ingredients: ["ingredient1", "ingredient2"],
            eCodes: ["E471", "E951"],
            category: "Alimentaire",
            score: 70,
            glycemicIndex: 50
        };
    }
    async productExistsInDB(barcode) {
        const existing = await prisma_1.prisma.product.findFirst({
            where: { barcode }
        });
        return !!existing;
    }
    async saveAnalysisToDatabase(data) {
        try {
            await prisma_1.prisma.product.create({
                data: {
                    barcode: data.barcode,
                    title: data.analysis.productName,
                    category: data.analysis.category,
                    eco_score: data.score.overall / 100, // Normaliser sur 0-1
                    ai_confidence: data.score.confidence || 0.8,
                    slug: this.generateSlug(data.analysis.productName),
                    analysis_data: JSON.stringify(data.scientificData),
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
            console.log('✅ Analyse sauvegardée en base');
        }
        catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
        }
    }
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    async generateFallbackAnalysis(requestBody) {
        return {
            message: "Analyse simplifiée suite à erreur technique",
            basicScore: 50,
            recommendation: "Relancer l'analyse ou contacter le support"
        };
    }
}
// 🆕 INSTANCE ET EXPORTS
const enhancedController = new EnhancedProductsController();
/**
 * Convertit les décimaux Prisma en `number` (fonction existante conservée)
 */
function sanitizeProduct(product) {
    return {
        ...product,
        eco_score: product.eco_score ? Number(product.eco_score) : null,
        ai_confidence: product.ai_confidence ? Number(product.ai_confidence) : null
    };
}
// 🆕 EXPORTS RÉVOLUTIONNAIRES + EXISTANTS
exports.analyzeProductRevolutionary = enhancedController.analyzeProductRevolutionary;
// Conservez tous vos exports existants
const getAllProducts = async (req, res) => {
    const products = await prisma_1.prisma.product.findMany({
        orderBy: { updated_at: "desc" },
        take: 50
    });
    const sanitized = products.map(sanitizeProduct);
    res.json(sanitized);
};
exports.getAllProducts = getAllProducts;
const getProductBySlug = async (req, res) => {
    const { slug } = req.params;
    const product = await prisma_1.prisma.product.findUnique({
        where: { slug }
    });
    if (!product) {
        return res.status(404).json({ error: "Produit non trouvé" });
    }
    res.json(sanitizeProduct(product));
};
exports.getProductBySlug = getProductBySlug;
const createProduct = async (req, res) => {
    const data = req.body;
    const product = await prisma_1.prisma.product.create({
        data
    });
    res.status(201).json(sanitizeProduct(product));
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const product = await prisma_1.prisma.product.update({
        where: { id },
        data
    });
    res.json(sanitizeProduct(product));
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    await prisma_1.prisma.product.delete({
        where: { id }
    });
    res.status(204).send();
};
exports.deleteProduct = deleteProduct;
const searchProducts = async (req, res) => {
    const { q = "", category = "", min_score = "0", max_score = "1" } = req.query;
    const products = await prisma_1.prisma.product.findMany({
        where: {
            title: { contains: q, mode: "insensitive" },
            category: category || undefined,
            eco_score: {
                gte: parseFloat(min_score),
                lte: parseFloat(max_score)
            }
        },
        orderBy: { updated_at: "desc" },
        take: 50
    });
    const sanitized = products.map(sanitizeProduct);
    res.json({
        products: sanitized,
        count: sanitized.length,
        filters: {
            q,
            category,
            min_score: parseFloat(min_score),
            max_score: parseFloat(max_score)
        }
    });
};
exports.searchProducts = searchProducts;
const getProductStats = async (req, res) => {
    const total = await prisma_1.prisma.product.count();
    const average = await prisma_1.prisma.product.aggregate({
        _avg: {
            eco_score: true
        }
    });
    const categories = await prisma_1.prisma.product.groupBy({
        by: ["category"],
        _count: { category: true },
        orderBy: { _count: { category: "desc" } }
    });
    const top = await prisma_1.prisma.product.findMany({
        orderBy: { eco_score: "desc" },
        take: 5
    });
    res.json({
        total_products: total,
        average_eco_score: average._avg.eco_score ? Number(average._avg.eco_score) : null,
        categories,
        top_products: top.map(sanitizeProduct)
    });
};
exports.getProductStats = getProductStats;

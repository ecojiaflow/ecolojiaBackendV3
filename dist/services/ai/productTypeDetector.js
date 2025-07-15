"use strict";
// src/services/ai/productTypeDetector.js
/**
 * 🔍 ECOLOJIA ProductTypeDetector v1.0
 * Détection automatique du type de produit (food/cosmetic/detergent)
 * Basé sur analyse mots-clés, ingrédients et patterns
 */
const { logger } = require('../../logger');
class ProductTypeDetector {
    constructor() {
        // Base de données mots-clés par catégorie
        this.keywords = {
            food: {
                // Noms de produits alimentaires
                products: [
                    'yaourt', 'yogurt', 'lait', 'fromage', 'beurre', 'crème fraîche',
                    'pain', 'biscuit', 'gâteau', 'céréales', 'muesli', 'granola',
                    'jus', 'soda', 'boisson', 'eau', 'thé', 'café', 'tisane',
                    'sauce', 'ketchup', 'mayonnaise', 'moutarde', 'vinaigrette',
                    'chocolat', 'bonbon', 'confiture', 'miel', 'sirop',
                    'pâtes', 'riz', 'quinoa', 'légumineuses', 'conserve',
                    'pizza', 'sandwich', 'burger', 'salade', 'soupe',
                    'viande', 'poisson', 'jambon', 'saucisse', 'charcuterie'
                ],
                // Catégories alimentaires
                categories: [
                    'alimentaire', 'nutrition', 'bio', 'organic', 'naturel',
                    'sans gluten', 'vegan', 'végétarien', 'lactose',
                    'snack', 'apéritif', 'dessert', 'petit-déjeuner',
                    'surgelé', 'frais', 'sec', 'épicerie', 'boulangerie'
                ],
                // Ingrédients typiquement alimentaires
                ingredients: [
                    'sucre', 'sel', 'farine', 'œuf', 'huile', 'vinaigre',
                    'levure', 'vanille', 'cacao', 'lécithine de soja',
                    'amidon', 'glucose', 'fructose', 'lactose',
                    'protéine', 'vitamine', 'calcium', 'fer',
                    'conservateur', 'colorant alimentaire', 'arôme naturel'
                ]
            },
            cosmetic: {
                // Types de cosmétiques
                products: [
                    'crème', 'lotion', 'sérum', 'gel', 'baume', 'huile',
                    'shampoing', 'après-shampoing', 'masque cheveux',
                    'fond de teint', 'rouge à lèvres', 'mascara', 'eye-liner',
                    'parfum', 'eau de toilette', 'déodorant', 'anti-transpirant',
                    'dentifrice', 'bain de bouche', 'savon', 'gel douche',
                    'gommage', 'exfoliant', 'démaquillant', 'tonique',
                    'bb cream', 'cc cream', 'primer', 'highlighter'
                ],
                // Catégories beauté
                categories: [
                    'cosmétique', 'beauté', 'soin', 'maquillage', 'parfumerie',
                    'visage', 'corps', 'cheveux', 'hygiène', 'bien-être',
                    'anti-âge', 'hydratant', 'nourrissant', 'purifiant',
                    'démaquillant', 'nettoyant', 'protecteur', 'réparateur'
                ],
                // Ingrédients INCI typiques
                ingredients: [
                    'aqua', 'glycerin', 'dimethicone', 'cetyl alcohol',
                    'butyrospermum parkii', 'tocopherol', 'retinol',
                    'hyaluronic acid', 'niacinamide', 'salicylic acid',
                    'panthenol', 'allantoin', 'bisabolol', 'caffeine',
                    'parfum', 'limonene', 'linalool', 'citronellol',
                    'paraben', 'sulfate', 'silicone', 'phenoxyethanol'
                ]
            },
            detergent: {
                // Types de détergents
                products: [
                    'lessive', 'détergent', 'liquide vaisselle', 'lave-vaisselle',
                    'nettoyant', 'dégraissant', 'désinfectant', 'javel',
                    'adoucissant', 'assouplissant', 'détachant', 'blanchissant',
                    'produit ménager', 'multi-surface', 'sol', 'vitres',
                    'wc', 'salle de bain', 'cuisine', 'four', 'frigo'
                ],
                // Catégories ménagères
                categories: [
                    'ménager', 'entretien', 'nettoyage', 'hygiène',
                    'lessiviel', 'vaisselle', 'maison', 'écologique',
                    'concentré', 'poudre', 'liquide', 'tablette',
                    'anti-calcaire', 'anti-graisse', 'antibactérien'
                ],
                // Ingrédients détergents typiques
                ingredients: [
                    'sodium lauryl sulfate', 'sodium laureth sulfate',
                    'coco glucoside', 'lauryl glucoside', 'decyl glucoside',
                    'sodium bicarbonate', 'citric acid', 'sodium percarbonate',
                    'protease', 'amylase', 'lipase', 'cellulase',
                    'phosphate', 'zeolite', 'polycarboxylate',
                    'optical brightener', 'benzalkonium chloride',
                    'sodium hypochlorite', 'hydrogen peroxide'
                ]
            }
        };
        // Patterns de détection avancés
        this.patterns = {
            food: {
                // Unités nutritionnelles
                nutritional: /(\d+)\s*(kcal|kj|calories|protéines|glucides|lipides|fibres|sodium)/i,
                // Codes additifs alimentaires
                additives: /E\d{3,4}/g,
                // Allergènes
                allergens: /(gluten|lactose|arachide|soja|œuf|poisson|crustacés)/i,
                // DLC/DDM
                dates: /(dlc|ddm|à consommer|best before|exp)/i
            },
            cosmetic: {
                // Ingrédients INCI (format standardisé)
                inci: /^[A-Z][A-Z\s\(\)0-9-]+$/,
                // Numéros de lot cosmétiques
                batch: /lot\s*[A-Z0-9]+/i,
                // Contenance cosmétique
                volume: /\d+\s*(ml|g|oz|fl\.oz)/i,
                // Certifications beauté
                certifs: /(ecocert|cosmebio|natrue|cruelty.free|vegan)/i
            },
            detergent: {
                // Dosage/concentration
                dosage: /(ml|doses|lavages|caps)/i,
                // pH et propriétés chimiques
                chemical: /(ph|alcalin|acide|concentré|biodégradable)/i,
                // Certifications écologiques
                eco_labels: /(ecolabel|nordic swan|cradle to cradle)/i,
                // Usages ménagers
                usage: /(lavage|nettoyage|dégraissage|désinfection)/i
            }
        };
    }
    /**
     * 🎯 Détection automatique du type de produit
     * @param {Object} productData - Données du produit
     * @returns {Object} Résultat de détection
     */
    detectProductType(productData) {
        try {
            logger.info('🔍 Détection automatique type de produit');
            // Préparation des données d'analyse
            const analysisData = this.prepareAnalysisData(productData);
            // Calcul des scores pour chaque type
            const scores = {
                food: this.calculateFoodScore(analysisData),
                cosmetic: this.calculateCosmeticScore(analysisData),
                detergent: this.calculateDetergentScore(analysisData)
            };
            // Détermination du type le plus probable
            const detection = this.determineType(scores);
            logger.info(`✅ Type détecté: ${detection.type} (confiance: ${detection.confidence})`);
            return {
                detected_type: detection.type,
                confidence: detection.confidence,
                scores: scores,
                reasoning: detection.reasoning,
                fallback_types: detection.alternatives,
                analysis_data: {
                    text_analyzed: analysisData.fullText.length,
                    ingredients_count: analysisData.ingredients.length,
                    keywords_found: detection.keywordsFound
                }
            };
        }
        catch (error) {
            logger.error(`❌ Erreur détection type produit: ${error.message}`);
            // Fallback sécurisé
            return {
                detected_type: 'food', // Type par défaut le plus courant
                confidence: 0.1,
                error: error.message,
                fallback_used: true
            };
        }
    }
    /**
     * 📋 Préparation des données pour analyse
     */
    prepareAnalysisData(productData) {
        // Extraction et normalisation du texte
        const textSources = [
            productData.product_name || productData.name || '',
            productData.description || '',
            productData.category || '',
            productData.brand || '',
            Array.isArray(productData.ingredients) ? productData.ingredients.join(' ') : (productData.ingredients || ''),
            productData.composition || '',
            productData.inci || ''
        ];
        const fullText = textSources.join(' ').toLowerCase();
        // Extraction ingrédients
        const ingredientsText = [
            productData.ingredients || '',
            productData.composition || '',
            productData.inci || ''
        ].join(' ');
        const ingredients = this.extractIngredients(ingredientsText);
        return {
            fullText,
            ingredients,
            productName: (productData.product_name || productData.name || '').toLowerCase(),
            category: (productData.category || '').toLowerCase(),
            brand: (productData.brand || '').toLowerCase()
        };
    }
    /**
     * 🥗 Calcul score alimentaire
     */
    calculateFoodScore(data) {
        let score = 0;
        const evidence = [];
        // Mots-clés produits alimentaires
        const productMatches = this.countKeywordMatches(data.fullText, this.keywords.food.products);
        score += productMatches * 20;
        if (productMatches > 0)
            evidence.push(`${productMatches} produits alimentaires détectés`);
        // Catégories alimentaires
        const categoryMatches = this.countKeywordMatches(data.fullText, this.keywords.food.categories);
        score += categoryMatches * 15;
        if (categoryMatches > 0)
            evidence.push(`${categoryMatches} catégories alimentaires`);
        // Ingrédients alimentaires
        const ingredientMatches = this.countKeywordMatches(data.fullText, this.keywords.food.ingredients);
        score += ingredientMatches * 10;
        if (ingredientMatches > 0)
            evidence.push(`${ingredientMatches} ingrédients alimentaires`);
        // Patterns spécifiques alimentation
        if (this.patterns.food.nutritional.test(data.fullText)) {
            score += 25;
            evidence.push('Informations nutritionnelles détectées');
        }
        if (this.patterns.food.additives.test(data.fullText)) {
            score += 20;
            evidence.push('Additifs alimentaires (E-codes) détectés');
        }
        if (this.patterns.food.allergens.test(data.fullText)) {
            score += 15;
            evidence.push('Allergènes alimentaires mentionnés');
        }
        return {
            score: Math.min(100, score),
            evidence,
            strength: score > 60 ? 'high' : score > 30 ? 'medium' : 'low'
        };
    }
    /**
     * 🧴 Calcul score cosmétique
     */
    calculateCosmeticScore(data) {
        let score = 0;
        const evidence = [];
        // Mots-clés produits cosmétiques
        const productMatches = this.countKeywordMatches(data.fullText, this.keywords.cosmetic.products);
        score += productMatches * 20;
        if (productMatches > 0)
            evidence.push(`${productMatches} produits cosmétiques détectés`);
        // Catégories beauté
        const categoryMatches = this.countKeywordMatches(data.fullText, this.keywords.cosmetic.categories);
        score += categoryMatches * 15;
        if (categoryMatches > 0)
            evidence.push(`${categoryMatches} catégories beauté`);
        // Ingrédients INCI
        const inciMatches = this.countKeywordMatches(data.fullText, this.keywords.cosmetic.ingredients);
        score += inciMatches * 12;
        if (inciMatches > 0)
            evidence.push(`${inciMatches} ingrédients INCI`);
        // Format INCI (ingrédients en majuscules)
        const upperCaseRatio = this.calculateUpperCaseRatio(data.ingredients.join(' '));
        if (upperCaseRatio > 0.8) {
            score += 30;
            evidence.push('Format INCI détecté (ingrédients majuscules)');
        }
        // Patterns cosmétiques
        if (this.patterns.cosmetic.volume.test(data.fullText)) {
            score += 15;
            evidence.push('Volume cosmétique standard détecté');
        }
        if (this.patterns.cosmetic.certifs.test(data.fullText)) {
            score += 20;
            evidence.push('Certifications beauté détectées');
        }
        return {
            score: Math.min(100, score),
            evidence,
            strength: score > 60 ? 'high' : score > 30 ? 'medium' : 'low'
        };
    }
    /**
     * 🧽 Calcul score détergent
     */
    calculateDetergentScore(data) {
        let score = 0;
        const evidence = [];
        // Mots-clés produits ménagers
        const productMatches = this.countKeywordMatches(data.fullText, this.keywords.detergent.products);
        score += productMatches * 25; // Poids plus élevé car mots-clés très spécifiques
        if (productMatches > 0)
            evidence.push(`${productMatches} produits ménagers détectés`);
        // Catégories entretien
        const categoryMatches = this.countKeywordMatches(data.fullText, this.keywords.detergent.categories);
        score += categoryMatches * 20;
        if (categoryMatches > 0)
            evidence.push(`${categoryMatches} catégories ménagères`);
        // Ingrédients détergents
        const ingredientMatches = this.countKeywordMatches(data.fullText, this.keywords.detergent.ingredients);
        score += ingredientMatches * 15;
        if (ingredientMatches > 0)
            evidence.push(`${ingredientMatches} ingrédients détergents`);
        // Patterns détergents
        if (this.patterns.detergent.dosage.test(data.fullText)) {
            score += 20;
            evidence.push('Instructions de dosage détectées');
        }
        if (this.patterns.detergent.chemical.test(data.fullText)) {
            score += 15;
            evidence.push('Propriétés chimiques mentionnées');
        }
        if (this.patterns.detergent.eco_labels.test(data.fullText)) {
            score += 25;
            evidence.push('Labels écologiques détectés');
        }
        return {
            score: Math.min(100, score),
            evidence,
            strength: score > 60 ? 'high' : score > 30 ? 'medium' : 'low'
        };
    }
    /**
     * 🎯 Détermination du type final
     */
    determineType(scores) {
        // Tri des scores par ordre décroissant
        const sortedTypes = Object.entries(scores)
            .sort(([, a], [, b]) => b.score - a.score)
            .map(([type, data]) => ({ type, ...data }));
        const winner = sortedTypes[0];
        const runner_up = sortedTypes[1];
        // Calcul confiance basé sur écart entre premier et second
        let confidence;
        const scoreDiff = winner.score - runner_up.score;
        if (winner.score >= 60 && scoreDiff >= 20) {
            confidence = 0.9; // Très confiant
        }
        else if (winner.score >= 40 && scoreDiff >= 15) {
            confidence = 0.7; // Confiant
        }
        else if (winner.score >= 25 && scoreDiff >= 10) {
            confidence = 0.5; // Modérément confiant
        }
        else {
            confidence = 0.3; // Peu confiant
        }
        // Collecte des mots-clés trouvés
        const keywordsFound = winner.evidence.length;
        return {
            type: winner.type,
            confidence: Math.round(confidence * 100) / 100,
            reasoning: winner.evidence,
            alternatives: sortedTypes.slice(1).map(t => ({
                type: t.type,
                score: t.score,
                reason: t.evidence[0] || 'Score faible'
            })),
            keywordsFound
        };
    }
    /**
     * 🔍 Utilitaires de traitement
     */
    countKeywordMatches(text, keywords) {
        return keywords.filter(keyword => text.includes(keyword.toLowerCase())).length;
    }
    calculateUpperCaseRatio(text) {
        if (!text || text.length === 0)
            return 0;
        const upperCaseChars = text.match(/[A-Z]/g) || [];
        const letters = text.match(/[A-Za-z]/g) || [];
        return letters.length > 0 ? upperCaseChars.length / letters.length : 0;
    }
    extractIngredients(ingredientsText) {
        if (!ingredientsText)
            return [];
        return ingredientsText
            .split(/[,;]/)
            .map(ing => ing.trim())
            .filter(ing => ing.length > 2);
    }
}
module.exports = { ProductTypeDetector };

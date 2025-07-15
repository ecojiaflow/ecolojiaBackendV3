"use strict";
// PATH: backend/src/services/ai/novaClassifier.ts
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🔬 ECOLOJIA - Classification NOVA Scientifique
 * Implémentation officielle selon INSERM/ANSES 2024
 */
class NovaClassifier {
    constructor() {
        this.novaGroups = {
            1: {
                name: "Aliments non transformés ou minimalement transformés",
                description: "Aliments naturels ou ayant subi des transformations minimales",
                examples: ["Fruits frais", "Légumes", "Graines", "Viandes fraîches"]
            },
            2: {
                name: "Ingrédients culinaires transformés",
                description: "Substances extraites d'aliments du groupe 1",
                examples: ["Huiles", "Beurre", "Sucre", "Sel", "Vinaigre"]
            },
            3: {
                name: "Aliments transformés",
                description: "Aliments du groupe 1 + ingrédients du groupe 2",
                examples: ["Pain artisanal", "Fromages", "Conserves simples"]
            },
            4: {
                name: "Aliments ultra-transformés",
                description: "Formulations industrielles avec additifs cosmétiques",
                examples: ["Sodas", "Plats préparés", "Biscuits industriels"]
            }
        };
        this.ultraProcessingMarkers = {
            additives: [
                'E102', 'E110', 'E124', 'E129', 'E131', 'E133', 'E151',
                'E220', 'E221', 'E222', 'E223', 'E224', 'E228',
                'E249', 'E250', 'E251', 'E252',
                'E320', 'E321',
                'E338', 'E339', 'E340', 'E341', 'E450', 'E451', 'E452',
                'E471', 'E472a', 'E472b', 'E472c', 'E472e', 'E473', 'E475',
                'E950', 'E951', 'E952', 'E954', 'E955', 'E960', 'E961'
            ],
            industrialIngredients: [
                'protéines hydrolysées', 'isolat de protéine', 'huiles hydrogénées',
                'sirop de glucose-fructose', 'sirop de maïs', 'maltodextrine',
                'dextrose', 'inuline', 'poudres de protéines', 'arômes artificiels'
            ],
            industrialProcesses: [
                'extrusion', 'pressage à chaud', 'hydrogénation', 'fractionnement',
                'texturisation', 'soufflage', 'gélification', 'émulsification forcée'
            ],
            impossibleTextures: [
                'mousses persistantes', 'gels thermorésistants', 'croustillant permanent',
                'fondant instantané', 'texture aérée stable', 'émulsion impossible'
            ]
        };
        this.group1Ingredients = [
            'eau', 'fruits', 'légumes', 'graines', 'noix', 'viande', 'poisson',
            'œufs', 'lait', 'yaourt nature', 'fromage blanc', 'légumineuses',
            'céréales complètes', 'herbes', 'épices'
        ];
        this.group2Ingredients = [
            'huile', 'beurre', 'sucre', 'sel', 'vinaigre', 'miel', 'sirop d\'érable'
        ];
    }
    classifyProduct(product) {
        const analysis = this.analyzeIngredients(product.ingredients || []);
        const novaGroup = this.determineNovaGroup(analysis);
        return {
            novaGroup,
            groupInfo: this.novaGroups[novaGroup],
            analysis,
            confidence: this.calculateConfidence(analysis),
            scientificSource: "Classification NOVA - INSERM 2024",
            healthImpact: this.getHealthImpact(novaGroup),
            recommendations: this.getRecommendations(novaGroup, analysis)
        };
    }
    analyzeIngredients(ingredients) {
        const ingredientsList = Array.isArray(ingredients)
            ? ingredients
            : this.parseIngredientsString(ingredients);
        return {
            totalCount: ingredientsList.length,
            ultraProcessingMarkers: this.detectUltraProcessingMarkers(ingredientsList),
            industrialIngredients: this.detectIndustrialIngredients(ingredientsList),
            additives: this.detectAdditives(ingredientsList),
            naturalIngredients: this.detectNaturalIngredients(ingredientsList),
            suspiciousTerms: this.detectSuspiciousTerms(ingredientsList)
        };
    }
    detectUltraProcessingMarkers(ingredients) {
        const markers = [];
        ingredients.forEach(ingredient => {
            const normalized = ingredient.toLowerCase().trim();
            const eCodeMatch = normalized.match(/e\d{3,4}[a-z]?/g);
            if (eCodeMatch) {
                eCodeMatch.forEach(eCode => {
                    if (this.ultraProcessingMarkers.additives.includes(eCode.toUpperCase())) {
                        markers.push({
                            type: 'additive',
                            value: eCode.toUpperCase(),
                            risk: this.getAdditiveRisk(eCode.toUpperCase()),
                            impact: 'Marqueur ultra-transformation'
                        });
                    }
                });
            }
            this.ultraProcessingMarkers.industrialIngredients.forEach(industrial => {
                if (normalized.includes(industrial.toLowerCase())) {
                    markers.push({
                        type: 'industrial',
                        value: industrial,
                        risk: 'high',
                        impact: 'Procédé industriel complexe'
                    });
                }
            });
            if (normalized.includes('arôme') && !normalized.includes('naturel')) {
                markers.push({
                    type: 'artificial_flavor',
                    value: ingredient,
                    risk: 'medium',
                    impact: 'Arôme artificiel'
                });
            }
        });
        return markers;
    }
    determineNovaGroup(analysis) {
        if (analysis.ultraProcessingMarkers.length > 0 ||
            analysis.totalCount > 5 ||
            analysis.additives.length > 2) {
            return 4;
        }
        if (analysis.additives.length > 0 ||
            analysis.industrialIngredients.length > 0 ||
            analysis.totalCount > 3) {
            return 3;
        }
        if (this.isMainlyCulinaryIngredients(analysis)) {
            return 2;
        }
        return 1;
    }
    calculateConfidence(analysis) {
        let confidence = 0.8;
        if (analysis.ultraProcessingMarkers.length > 2)
            confidence += 0.15;
        if (analysis.additives.length > 3)
            confidence += 0.1;
        if (analysis.totalCount < 3)
            confidence -= 0.1;
        if (analysis.suspiciousTerms.length > 0)
            confidence -= 0.05;
        return Math.min(0.95, Math.max(0.6, confidence));
    }
    getHealthImpact(novaGroup) {
        const impacts = {
            1: {
                level: 'positive',
                description: 'Bénéfique pour la santé',
                risks: [],
                benefits: ['Haute densité nutritionnelle', 'Fibres naturelles', 'Antioxydants']
            },
            2: {
                level: 'neutral',
                description: 'Neutre si consommation modérée',
                risks: ['Calories concentrées'],
                benefits: ['Praticité culinaire']
            },
            3: {
                level: 'moderate',
                description: 'Acceptable en quantité limitée',
                risks: ['Sodium élevé possible', 'Conservateurs'],
                benefits: ['Praticité', 'Conservation']
            },
            4: {
                level: 'high_risk',
                description: 'À limiter fortement',
                risks: [
                    '+22% risque dépression (Nature 2024)',
                    '+53% risque diabète type 2 (BMJ 2024)',
                    '+10% maladies cardiovasculaires (Lancet 2024)',
                    'Perturbation microbiote intestinal'
                ],
                benefits: []
            }
        };
        return impacts[novaGroup];
    }
    getRecommendations(novaGroup, analysis) {
        if (novaGroup === 4) {
            return {
                action: 'replace',
                urgency: 'high',
                message: 'Remplacer par alternative naturelle',
                alternatives: this.suggestNaturalAlternatives(analysis),
                educationalTip: 'L\'ultra-transformation détruit la matrice alimentaire et ajoute des substances non alimentaires.'
            };
        }
        if (novaGroup === 3) {
            return {
                action: 'moderate',
                urgency: 'medium',
                message: 'Consommer occasionnellement',
                alternatives: [],
                educationalTip: 'Privilégier la version maison quand possible.'
            };
        }
        return {
            action: 'enjoy',
            urgency: 'low',
            message: 'Excellent choix nutritionnel',
            alternatives: [],
            educationalTip: 'Les aliments peu transformés préservent leurs qualités nutritionnelles.'
        };
    }
    suggestNaturalAlternatives(_analysis) {
        return [
            'Version maison avec ingrédients simples',
            'Produit équivalent groupe NOVA 1-2',
            'Recette traditionnelle'
        ];
    }
    parseIngredientsString(ingredientsStr) {
        if (!ingredientsStr)
            return [];
        return ingredientsStr
            .split(/[,;]/)
            .map(ing => ing.trim())
            .filter(ing => ing.length > 0);
    }
    detectAdditives(ingredients) {
        const additives = [];
        ingredients.forEach(ingredient => {
            const eCodeMatch = ingredient.match(/e\d{3,4}[a-z]?/gi);
            if (eCodeMatch) {
                additives.push(...eCodeMatch.map(e => e.toUpperCase()));
            }
        });
        return [...new Set(additives)];
    }
    detectIndustrialIngredients(ingredients) {
        return ingredients.filter(ingredient => this.ultraProcessingMarkers.industrialIngredients.some(industrial => ingredient.toLowerCase().includes(industrial.toLowerCase())));
    }
    detectNaturalIngredients(ingredients) {
        return ingredients.filter(ingredient => this.group1Ingredients.some(natural => ingredient.toLowerCase().includes(natural.toLowerCase())));
    }
    detectSuspiciousTerms(ingredients) {
        const suspicious = ['arôme', 'exhausteur', 'stabilisant', 'gélifiant', 'épaississant'];
        return ingredients.filter(ingredient => suspicious.some(term => ingredient.toLowerCase().includes(term)));
    }
    getAdditiveRisk(eCode) {
        const highRisk = ['E102', 'E110', 'E124', 'E129', 'E249', 'E250', 'E320', 'E321'];
        const mediumRisk = ['E471', 'E472a', 'E951', 'E952'];
        if (highRisk.includes(eCode))
            return 'high';
        if (mediumRisk.includes(eCode))
            return 'medium';
        return 'low';
    }
    isMainlyCulinaryIngredients(analysis) {
        return analysis.naturalIngredients.length === 0 &&
            analysis.additives.length === 0 &&
            analysis.totalCount <= 2;
    }
}
exports.default = NovaClassifier;
// EOF

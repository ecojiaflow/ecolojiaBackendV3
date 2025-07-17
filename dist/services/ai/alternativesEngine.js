"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class NaturalAlternativesEngine {
    constructor() {
        this.alternativesDatabase = [];
        this.diyRecipes = {};
        this.scientificEvidence = {};
        this.buildAlternativesDatabase();
        this.buildScientificEvidence();
        this.buildDIYRecipes();
    }
    buildAlternativesDatabase() {
        this.alternativesDatabase = [
            {
                category: 'cleaning',
                alternatives: ['vinaigre blanc', 'bicarbonate de soude', 'citron'],
                evidence: 'source: ADEME, efficacité des produits naturels'
            },
            {
                category: 'cosmetics',
                alternatives: ['huile de coco', 'beurre de karité', 'aloé vera'],
                evidence: 'source: UFC Que Choisir, alternatives naturelles cosmétiques'
            }
        ];
    }
    buildScientificEvidence() {
        this.scientificEvidence = {
            vinaigre: 'Antibactérien, désinfectant (PubMed 2020)',
            bicarbonate: 'Détergent doux, désodorisant naturel (EPA, 2018)',
            coco: 'Hydratant reconnu (Dermatology Review, 2019)',
            citron: 'Antiseptique, parfumant naturel (EFSA, 2021)'
        };
    }
    buildDIYRecipes() {
        this.diyRecipes = {
            'nettoyant multi-usage': 'Mélange 1/2 vinaigre blanc + 1/2 eau + quelques gouttes de citron',
            'dentifrice maison': 'Bicarbonate + huile de coco + goutte huile essentielle menthe',
            'masque hydratant': 'Aloé vera + miel bio + huile d’argan – 15 min pause sur le visage'
        };
    }
    getAlternatives(category) {
        const entry = this.alternativesDatabase.find((e) => e.category === category);
        return entry?.alternatives || [];
    }
    getScientificEvidence(ingredient) {
        return this.scientificEvidence[ingredient.toLowerCase()] || 'Données indisponibles';
    }
    getDIYRecipe(label) {
        return this.diyRecipes[label.toLowerCase()] || 'Recette non trouvée';
    }
}
exports.default = NaturalAlternativesEngine;
// EOF

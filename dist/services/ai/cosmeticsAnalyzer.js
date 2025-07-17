"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CosmeticsAnalyzer {
    constructor() {
        this.cosmeticsData = [];
        this.allergens = [];
        this.endocrineDisruptors = [];
        this.loadData();
    }
    loadData() {
        this.cosmeticsData = [
            'aqua',
            'glycerin',
            'alcohol',
            'parfum',
            'limonene',
            'linalool',
            'bht',
            'phenoxyethanol',
        ];
        this.allergens = ['limonene', 'linalool'];
        this.endocrineDisruptors = ['bht', 'phenoxyethanol'];
    }
    analyze(ingredients) {
        const safe = [];
        const allergens = [];
        const endocrine = [];
        for (const ing of ingredients) {
            const norm = ing.toLowerCase();
            if (this.endocrineDisruptors.includes(norm)) {
                endocrine.push(norm);
            }
            else if (this.allergens.includes(norm)) {
                allergens.push(norm);
            }
            else {
                safe.push(norm);
            }
        }
        return { safe, allergens, endocrine };
    }
    getIngredientList() {
        return this.cosmeticsData;
    }
    getAllergenList() {
        return this.allergens;
    }
    getEndocrineList() {
        return this.endocrineDisruptors;
    }
}
exports.default = CosmeticsAnalyzer;
// EOF

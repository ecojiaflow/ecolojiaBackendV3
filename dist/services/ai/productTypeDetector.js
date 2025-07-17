"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ProductTypeDetector {
    constructor() {
        this.keywords = [];
        this.patterns = [];
        this.buildKeywords();
        this.buildPatterns();
    }
    buildKeywords() {
        this.keywords = [
            'savon',
            'shampoing',
            'lessive',
            'gel douche',
            'détergent',
            'nettoyant',
            'crème',
            'dentifrice',
            'biscuit',
            'céréales',
            'jus',
            'yaourt'
        ];
    }
    buildPatterns() {
        this.patterns = [
            {
                label: 'cosmetics',
                keywords: ['savon', 'shampoing', 'gel douche', 'crème', 'dentifrice']
            },
            {
                label: 'detergents',
                keywords: ['lessive', 'détergent', 'nettoyant']
            },
            {
                label: 'food',
                keywords: ['biscuit', 'céréales', 'jus', 'yaourt']
            }
        ];
    }
    detect(input) {
        const lowerInput = input.toLowerCase();
        const matches = [];
        for (const pattern of this.patterns) {
            for (const word of pattern.keywords) {
                if (lowerInput.includes(word)) {
                    matches.push({ label: pattern.label, score: 1 });
                }
            }
        }
        if (matches.length === 0) {
            return { label: 'unknown', score: 0 };
        }
        // Fusionner les scores par label
        const aggregated = {};
        for (const match of matches) {
            aggregated[match.label] = (aggregated[match.label] || 0) + 1;
        }
        const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
        return { label: sorted[0][0], score: sorted[0][1] };
    }
    getAllLabels() {
        return this.patterns.map((p) => p.label);
    }
    getKeywords() {
        return this.keywords;
    }
}
exports.default = ProductTypeDetector;
// EOF

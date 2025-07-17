"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DetergentsAnalyzer {
    constructor() {
        this.detergentsData = [];
        this.dangerousVOCs = [];
        this.ecoCertifications = [];
        this.loadData();
    }
    loadData() {
        this.detergentsData = [
            'sodium laureth sulfate',
            'ammonium quaternary compounds',
            'limonene',
            'ethanol',
            'benzisothiazolinone',
            'sodium carbonate'
        ];
        this.dangerousVOCs = [
            'limonene',
            'ethanol',
            'ammonium quaternary compounds'
        ];
        this.ecoCertifications = ['ecocert', 'european ecolabel', 'nature & progrès'];
    }
    analyze(ingredients) {
        const safe = [];
        const dangerous = [];
        for (const ing of ingredients) {
            const norm = ing.toLowerCase();
            if (this.dangerousVOCs.includes(norm)) {
                dangerous.push(norm);
            }
            else {
                safe.push(norm);
            }
        }
        return {
            safe,
            dangerous,
            certifications: this.ecoCertifications
        };
    }
    checkEcoCertifications(description) {
        const found = [];
        for (const cert of this.ecoCertifications) {
            if (description.toLowerCase().includes(cert)) {
                found.push(cert);
            }
        }
        return found;
    }
}
exports.default = DetergentsAnalyzer;
// EOF

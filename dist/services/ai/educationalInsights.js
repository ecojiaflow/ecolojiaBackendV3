"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EducationalInsightsEngine {
    constructor() {
        this.scientificDatabase = {};
        this.educationalTemplates = [];
        this.microLearningModules = [];
        this.buildScientificDatabase();
        this.buildEducationalTemplates();
        this.buildMicroLearningModules();
    }
    buildScientificDatabase() {
        this.scientificDatabase = {
            'fibres': 'Améliore le transit intestinal, selon INSERM 2022.',
            'probiotiques': 'Renforce la flore intestinale – étude INRA 2021.',
            'sucre': 'Trop de sucres → perturbation métabolique – EFSA 2023.'
        };
    }
    buildEducationalTemplates() {
        this.educationalTemplates = [
            {
                goal: 'digestion',
                advice: 'Privilégiez les aliments riches en fibres comme les légumes secs.'
            },
            {
                goal: 'immunité',
                advice: 'Consommez des probiotiques naturels (yaourt, kéfir).'
            }
        ];
    }
    buildMicroLearningModules() {
        this.microLearningModules = [
            {
                title: 'Pourquoi les fibres ?',
                description: 'Elles nourrissent vos bonnes bactéries intestinales.'
            },
            {
                title: 'Les dangers du sucre',
                description: 'Un excès quotidien augmente le risque de diabète.'
            }
        ];
    }
    generate({ productName, ingredients, userGoals }) {
        const scientific = [];
        const advice = [];
        for (const goal of userGoals) {
            const match = this.educationalTemplates.find((tpl) => tpl.goal === goal);
            if (match)
                advice.push(match.advice);
        }
        for (const ing of ingredients.toLowerCase().split(/[,\\s]+/)) {
            const sci = this.scientificDatabase[ing];
            if (sci)
                scientific.push(`${ing} → ${sci}`);
        }
        return {
            scientific,
            advice,
            modules: this.microLearningModules
        };
    }
}
exports.default = EducationalInsightsEngine;
// EOF

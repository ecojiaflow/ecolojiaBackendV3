"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: src/services/ai/insightsGenerator.ts
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class InsightsGenerator {
    constructor() {
        this.insightsDB = {};
        this.loadDatabase();
    }
    async loadDatabase() {
        try {
            const filePath = path_1.default.join(__dirname, '../../data/educational-insights-db.json');
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            this.insightsDB = JSON.parse(content);
            console.log('✅ Insights DB chargée:', Object.keys(this.insightsDB).length, 'entrées');
        }
        catch (err) {
            console.error('❌ Error loading insights database:', err.message);
            this.insightsDB = {}; // fallback vide
        }
    }
    async generate(productCategory) {
        return this.insightsDB[productCategory] || [
            {
                type: 'info',
                message: 'Aucun insight éducatif trouvé pour cette catégorie.'
            }
        ];
    }
    getAllCategories() {
        return Object.keys(this.insightsDB);
    }
}
exports.default = InsightsGenerator;
// EOF

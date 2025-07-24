"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisService = exports.AIAnalysisService = void 0;
// PATH: backend/src/services/ai/AIAnalysisService.ts
const DeepSeekClient_1 = require("./DeepSeekClient");
const Logger_1 = require("../../utils/Logger");
const ProductAnalysis_1 = require("../../models/ProductAnalysis");
const CacheManager_1 = require("../cache/CacheManager");
const logger = new Logger_1.Logger('AIAnalysisService');
class AIAnalysisService {
    async analyze(req) {
        logger.info(`Analyse IA : ${req.productName}`);
        // 1 : cache météo
        const key = `analysis:${req.category}:${req.productName}`;
        const cached = await CacheManager_1.cacheManager.get(key);
        if (cached && !req.prompt)
            return cached;
        // 2 : mock analyse de base (à remplacer par vos services internes)
        const base = { score: 75, issues: ['sucre'] };
        // 3 : DeepSeek enrichment (premium uniquement)
        let enhance = null;
        if (req.premium) {
            enhance = await DeepSeekClient_1.deepSeekClient.enhanceProductAnalysis({
                productName: req.productName,
                category: req.category,
                baseAnalysis: base,
                userQuery: req.prompt
            });
        }
        const result = {
            productName: req.productName,
            category: req.category,
            base,
            enhance,
            createdAt: new Date()
        };
        // 4 : persistance Mongo + cache
        await ProductAnalysis_1.ProductAnalysisModel.create(result);
        await CacheManager_1.cacheManager.set(key, result, 86400);
        return result;
    }
}
exports.AIAnalysisService = AIAnalysisService;
exports.aiAnalysisService = new AIAnalysisService();
// EOF

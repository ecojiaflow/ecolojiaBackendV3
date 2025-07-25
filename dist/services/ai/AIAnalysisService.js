"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisService = void 0;
// PATH: backend/src/services/ai/AIAnalysisService.ts
const Logger_1 = require("../../utils/Logger");
const AnalysisCache_1 = require("../cache/AnalysisCache");
const HealthScoreCalculator_1 = require("./HealthScoreCalculator");
const novaClassifier_1 = require("./novaClassifier");
const DeepSeekClient_1 = require("./DeepSeekClient");
const log = new Logger_1.Logger('AIAnalysisService');
const HIGH_RISK = new Set([
    'E102', 'E110', 'E124', 'E129', 'E150D', 'E249', 'E250', 'E320', 'E321'
]);
class AIAnalysisService {
    async analyzeProduct(req) {
        /* 1. Cache */
        const cached = await AnalysisCache_1.analysisCache.getAnalysisByProduct(req.productName, req.category, req.ingredients ?? []);
        if (cached && !req.customPrompt) {
            log.info('✅ Cache HIT');
            return cached;
        }
        /* 2. Base NOVA */
        const nova = await novaClassifier_1.novaClassifier.classify({
            title: req.productName,
            ingredients: req.ingredients ?? []
        });
        /* 3. HealthScore */
        const score = HealthScoreCalculator_1.healthScoreCalculator.calculate({
            category: req.category,
            productName: req.productName,
            ingredients: req.ingredients ?? [],
            novaAnalysis: {
                group: nova.novaGroup,
                confidence: nova.confidence,
                additives: nova.analysis.additives.map((code) => ({
                    code,
                    name: code,
                    riskLevel: HIGH_RISK.has(code) ? 'high' : 'medium'
                }))
            }
        });
        /* 4. Result */
        const now = new Date();
        const result = {
            id: `an-${now.getTime()}`,
            productName: req.productName,
            category: req.category,
            healthScore: score.score,
            analysis: { nova, healthScore: score },
            insights: {
                educational: score.recommendations,
                recommendations: [],
                warnings: []
            },
            alternatives: [],
            scientificSources: ['INSERM 2024', 'ANSES 2024'],
            confidence: score.confidence,
            analyzedAt: now
        };
        /* 5. DeepSeek (premium) */
        if (req.userTier === 'premium' && req.useDeepSeek) {
            const enh = await DeepSeekClient_1.deepSeekClient.enhanceProductAnalysis({
                productName: req.productName,
                category: req.category,
                baseAnalysis: result,
                userQuery: req.customPrompt
            });
            result.aiEnhancement = enh;
            result.insights.educational.push(...enh.enhancedInsights);
            result.insights.recommendations.push(...enh.personalizedRecommendations);
            result.confidence = Math.max(result.confidence, enh.confidence);
        }
        /* 6. Cache */
        await AnalysisCache_1.analysisCache.cacheAnalysis({
            id: result.id,
            productName: result.productName,
            barcode: req.barcode,
            category: result.category,
            healthScore: result.healthScore,
            analysis: result,
            analyzedAt: result.analyzedAt
        }, req.ingredients ?? []);
        return result;
    }
}
exports.aiAnalysisService = new AIAnalysisService();
// EOF

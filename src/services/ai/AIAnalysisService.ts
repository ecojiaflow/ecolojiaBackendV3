// PATH: backend/src/services/ai/AIAnalysisService.ts
import { Logger } from '../../utils/Logger';
import { analysisCache } from '../cache/AnalysisCache';
import { healthScoreCalculator } from './HealthScoreCalculator';
import { novaClassifier } from './novaClassifier';
import { deepSeekClient } from './DeepSeekClient';

const log = new Logger('AIAnalysisService');

export interface ProductAnalysisRequest {
  productName: string;
  category: 'food' | 'cosmetics' | 'detergents';
  ingredients?: string[];
  barcode?: string;
  userId: string;
  userTier: 'free' | 'premium';
  useDeepSeek?: boolean;
  customPrompt?: string;
}

export interface ProductAnalysisResult {
  id: string;
  productName: string;
  category: 'food' | 'cosmetics' | 'detergents';
  healthScore: number;
  analysis: any;
  insights: { educational: string[]; recommendations: string[]; warnings?: string[] };
  alternatives: any[];
  scientificSources: string[];
  aiEnhancement?: any;
  confidence: number;
  analyzedAt: Date;
}

const HIGH_RISK = new Set([
  'E102','E110','E124','E129','E150D','E249','E250','E320','E321'
]);

class AIAnalysisService {
  async analyzeProduct(req: ProductAnalysisRequest): Promise<ProductAnalysisResult> {
    /* 1. Cache */
    const cached = await analysisCache.getAnalysisByProduct(
      req.productName,
      req.category,
      req.ingredients ?? []
    ) as ProductAnalysisResult | null;

    if (cached && !req.customPrompt) {
      log.info('✅ Cache HIT');
      return cached;
    }

    /* 2. Base NOVA */
    const nova = await novaClassifier.classify({
      title: req.productName,
      ingredients: req.ingredients ?? []
    });

    /* 3. HealthScore */
    const score = healthScoreCalculator.calculate({
      category: req.category,
      productName: req.productName,
      ingredients: req.ingredients ?? [],
      novaAnalysis: {
        group: nova.novaGroup,
        confidence: nova.confidence,
        additives: nova.analysis.additives.map((code: string) => ({
          code,
          name: code,
          riskLevel: HIGH_RISK.has(code) ? 'high' : 'medium'
        }))
      }
    } as any);

    /* 4. Result */
    const now = new Date();
    const result: ProductAnalysisResult = {
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
      const enh = await deepSeekClient.enhanceProductAnalysis({
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
    await analysisCache.cacheAnalysis(
      {
        id: result.id,
        productName: result.productName,
        barcode: req.barcode,
        category: result.category,
        healthScore: result.healthScore,
        analysis: result,
        analyzedAt: result.analyzedAt
      },
      req.ingredients ?? []
    );

    return result;
  }
}

export const aiAnalysisService = new AIAnalysisService();
// EOF

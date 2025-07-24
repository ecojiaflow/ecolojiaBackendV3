// PATH: backend/src/services/ai/AIAnalysisService.ts
import { deepSeekClient } from './DeepSeekClient';
import { Logger } from '../../utils/Logger';
import { ProductAnalysisModel } from '../../models/ProductAnalysis';
import { cacheManager } from '../cache/CacheManager';

const logger = new Logger('AIAnalysisService');

export interface AnalysisRequest {
  productName: string;
  category: 'food' | 'cosmetics' | 'detergents';
  ingredients?: string[];
  userId: string;
  premium: boolean;
  prompt?: string;
}

export class AIAnalysisService {
  async analyze(req: AnalysisRequest) {
    logger.info(`Analyse IA : ${req.productName}`);

    // 1 : cache météo
    const key = `analysis:${req.category}:${req.productName}`;
    const cached = await cacheManager.get(key);
    if (cached && !req.prompt) return cached;

    // 2 : mock analyse de base (à remplacer par vos services internes)
    const base = { score: 75, issues: ['sucre'] };

    // 3 : DeepSeek enrichment (premium uniquement)
    let enhance: any = null;
    if (req.premium) {
      enhance = await deepSeekClient.enhanceProductAnalysis({
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
    await ProductAnalysisModel.create(result);
    await cacheManager.set(key, result, 86_400);

    return result;
  }
}

export const aiAnalysisService = new AIAnalysisService();
// EOF

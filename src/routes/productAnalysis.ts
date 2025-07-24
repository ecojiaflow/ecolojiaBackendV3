// backend/src/routes/productAnalysis.ts

import { Router, Request, Response } from 'express';
import { authenticate } from '../auth/middleware/auth';
import { quotaManager } from '../services/QuotaManager';
import { analysisCache } from '../services/cache/AnalysisCache';
import { productAnalysisService } from '../services/productAnalysisService';
import { Logger } from '../utils/Logger';

const logger = new Logger('ProductAnalysisRoute');

const router = Router();

/**
 * POST /api/products/analyze
 * Analyser un produit (avec cache et quotas)
 */
router.post(
  '/analyze',
  authenticate,
  quotaManager.createQuotaMiddleware('scan'),
  async (req: Request, res: Response) => {
    try {
      const { productName, category, ingredients, barcode, image } = req.body;

      // Validation des données
      if (!productName || !category) {
        return res.status(400).json({
          success: false,
          message: 'Nom du produit et catégorie requis'
        });
      }

      const validCategories = ['food', 'cosmetics', 'detergents'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie invalide',
          validCategories
        });
      }

      // 1. Vérifier le cache d'abord
      const startTime = Date.now();
      let cachedAnalysis = null;

      if (barcode) {
        cachedAnalysis = await analysisCache.getAnalysisByBarcode(barcode);
      }

      if (!cachedAnalysis && ingredients) {
        cachedAnalysis = await analysisCache.getAnalysisByProduct(
          productName,
          category,
          ingredients
        );
      }

      if (cachedAnalysis) {
        const cacheTime = Date.now() - startTime;
        logger.info(`✅ Analysis Cache HIT (${cacheTime}ms): ${productName}`);
        
        return res.json({
          success: true,
          data: cachedAnalysis,
          cached: true,
          quota: req.quota
        });
      }

      // 2. Cache MISS - Effectuer l'analyse
      logger.info(`❌ Analysis Cache MISS: ${productName}`);
      
      const analysis = await productAnalysisService.analyzeProduct({
        name: productName,
        category,
        ingredients,
        barcode,
        image,
        userId: req.user!.id
      });

      // 3. Stocker en cache pour les prochaines fois
      await analysisCache.cacheAnalysis(
        {
          id: analysis.id,
          productName: analysis.productName,
          barcode: analysis.barcode,
          category: analysis.category,
          healthScore: analysis.healthScore,
          analysis: analysis,
          analyzedAt: new Date()
        },
        ingredients
      );

      const totalTime = Date.now() - startTime;
      logger.info(`⏱️ Analysis complete (${totalTime}ms): ${productName}`);

      return res.json({
        success: true,
        data: analysis,
        cached: false,
        quota: req.quota
      });

    } catch (error: any) {
      logger.error('❌ Error analyzing product:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'analyse du produit',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/products/analysis/:id
 * Récupérer une analyse par ID
 */
router.get(
  '/analysis/:id',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Vérifier le cache d'abord
      const cachedAnalysis = await analysisCache.getAnalysisById(id);
      
      if (cachedAnalysis) {
        return res.json({
          success: true,
          data: cachedAnalysis,
          cached: true
        });
      }

      // Si pas en cache, récupérer de la DB
      const analysis = await productAnalysisService.getAnalysisById(id, req.user!.id);
      
      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analyse non trouvée'
        });
      }

      // Mettre en cache pour les prochaines fois
      await analysisCache.cacheAnalysis({
        id: analysis.id,
        productName: analysis.productName,
        barcode: analysis.barcode,
        category: analysis.category,
        healthScore: analysis.healthScore,
        analysis: analysis,
        analyzedAt: analysis.createdAt
      });

      return res.json({
        success: true,
        data: analysis,
        cached: false
      });

    } catch (error: any) {
      logger.error('❌ Error getting analysis:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'analyse',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/products/history
 * Historique des analyses de l'utilisateur
 */
router.get(
  '/history',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, category } = req.query;
      
      const history = await productAnalysisService.getUserHistory(
        req.user!.id,
        {
          page: Number(page),
          limit: Number(limit),
          category: category as string
        }
      );

      return res.json({
        success: true,
        data: history
      });

    } catch (error: any) {
      logger.error('❌ Error getting history:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique'
      });
    }
  }
);

/**
 * GET /api/products/stats
 * Statistiques des analyses de l'utilisateur
 */
router.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const stats = await productAnalysisService.getUserStats(req.user!.id);

      return res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      logger.error('❌ Error getting stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }
);

/**
 * GET /api/products/quota
 * Statut des quotas de l'utilisateur
 */
router.get(
  '/quota',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const quotaStatus = await quotaManager.getUserQuotaStatus(
        req.user!.id,
        // @ts-ignore - TypeScript error temporairement ignor�
      );

      return res.json({
        success: true,
        data: quotaStatus
      });

    } catch (error: any) {
      logger.error('❌ Error getting quota status:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des quotas'
      });
    }
  }
);

/**
 * POST /api/products/warmup-cache
 * Réchauffer le cache avec les produits populaires (admin only)
 */
router.post(
  '/warmup-cache',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      // Vérifier si l'utilisateur est admin
      if (req.user!.email !== 'admin@ecolojia.com') {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      const popularProducts = [
        { name: 'Nutella', category: 'food', barcode: '3017620422003' },
        { name: 'Coca-Cola', category: 'food', barcode: '5449000000996' },
        { name: 'Dove Savon', category: 'cosmetics', barcode: '8711600531499' },
        // Ajouter plus de produits populaires
      ];

      const warmedCount = await analysisCache.warmupCache(popularProducts);

      return res.json({
        success: true,
        message: `Cache réchauffé avec ${warmedCount} produits`,
        data: { warmedCount, total: popularProducts.length }
      });

    } catch (error: any) {
      logger.error('❌ Error warming cache:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du réchauffement du cache'
      });
    }
  }
);

export default router;

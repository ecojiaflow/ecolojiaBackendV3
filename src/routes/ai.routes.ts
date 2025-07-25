// PATH: backend/src/routes/ai.routes.ts
import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../auth/middleware/auth';
import { aiAnalysisService } from '../services/ai/AIAnalysisService';
import { Logger } from '../utils/Logger';

const router = express.Router();
const log = new Logger('AIRoutes');

// ═══════════════════════════════════════════════════════════════════════
// ANALYSE PRODUIT PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════

router.post('/analyze', authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const {
      productName,
      category,
      ingredients,
      barcode,
      useDeepSeek,
      customPrompt
    } = req.body;

    // Validation
    if (!productName || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nom du produit et catégorie requis',
        code: 'MISSING_FIELDS'
      });
    }

    if (!['food', 'cosmetics', 'detergents'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie invalide. Doit être: food, cosmetics ou detergents',
        code: 'INVALID_CATEGORY'
      });
    }

    log.info(`Analyse demandée: ${productName} (${category}) par ${authReq.user!.email}`);

    // Analyse
    const result = await aiAnalysisService.analyzeProduct({
      productName,
      category,
      ingredients: ingredients
        ? typeof ingredients === 'string' 
          ? ingredients.split(',').map((i: string) => i.trim())
          : ingredients
        : undefined,
      barcode,
      userId: authReq.user!.id,
      userTier: authReq.user!.tier,
      useDeepSeek: useDeepSeek && authReq.user!.tier === 'premium',
      customPrompt
    });

    // Réponse
    res.json({ 
      success: true, 
      data: result,
      user: {
        id: authReq.user!.id,
        tier: authReq.user!.tier
      }
    });

  } catch (error: any) {
    log.error('Erreur analyse:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'analyse',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ANALYSE RAPIDE (sans auth pour demo)
// ═══════════════════════════════════════════════════════════════════════

router.post('/quick-analyze', async (req: Request, res: Response) => {
  try {
    const { productName, category, ingredients } = req.body;

    if (!productName || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nom du produit et catégorie requis' 
      });
    }

    log.info(`Analyse rapide: ${productName} (${category})`);

    const result = await aiAnalysisService.analyzeProduct({
      productName,
      category,
      ingredients: ingredients
        ? typeof ingredients === 'string' 
          ? ingredients.split(',').map((i: string) => i.trim())
          : ingredients
        : undefined,
      userId: 'anonymous',
      userTier: 'free',
      useDeepSeek: false
    });

    res.json({ 
      success: true, 
      data: result,
      mode: 'quick',
      limitations: [
        'Analyse basique sans personnalisation',
        'Pas d\'historique sauvegardé',
        'Pas d\'accès aux features premium'
      ]
    });

  } catch (error: any) {
    log.error('Erreur analyse rapide:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'analyse' 
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// HISTORIQUE ANALYSES
// ═══════════════════════════════════════════════════════════════════════

router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { limit = 10, offset = 0 } = req.query;

    // TODO: Implémenter récupération depuis DB
    const history = {
      analyses: [],
      total: 0,
      limit: Number(limit),
      offset: Number(offset)
    };

    res.json({
      success: true,
      data: history
    });

  } catch (error: any) {
    log.error('Erreur récupération historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// DÉTAILS ANALYSE
// ═══════════════════════════════════════════════════════════════════════

router.get('/analysis/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // TODO: Récupérer depuis cache ou DB
    // Vérifier que l'analyse appartient à l'utilisateur

    res.json({
      success: true,
      data: null,
      message: 'Endpoint en développement'
    });

  } catch (error: any) {
    log.error('Erreur récupération analyse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'analyse'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// EXPORT PDF
// ═══════════════════════════════════════════════════════════════════════

router.post('/export/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { format = 'pdf' } = req.body;

    // TODO: Implémenter génération PDF/CSV
    res.json({
      success: false,
      message: 'Export en cours de développement'
    });

  } catch (error: any) {
    log.error('Erreur export:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export'
    });
  }
});

export default router;
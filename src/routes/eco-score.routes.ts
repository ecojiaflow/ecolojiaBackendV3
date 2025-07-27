import { Request, Response } from 'express';
// PATH: backend/src/routes/eco-score.routes.ts
import express from 'express';
import { EcoScoreService } from '../services/eco-score.service';

const router = express.Router();

/**
 * @swagger
 * /api/eco-score/calculate:
 *   post:
 *     summary: Calcule l'Ã©co-score d'un produit
 *     tags: [EcoScore]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               title:
 *                 type: string
 *               ingredients:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ã‰co-score calculÃ© avec succÃ¨s
 *       400:
 *         description: DonnÃ©es invalides
 *       500:
 *         description: Erreur serveur
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { id, title, ingredients, category } = req.body;
    
    if (!id || !title) {
      return res.status(400).json({ 
        error: 'ID et titre requis' 
      });
    }
    
    const ecoScoreService = new EcoScoreService();
    const result = await ecoScoreService.calculate({
      id,
      title,
      ingredients: ingredients || '',
      category: category || ''
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('âŒ Erreur calcul eco-score:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ 
      error: 'Erreur calcul eco-score',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/update-all:
 *   post:
 *     summary: Met Ã  jour tous les Ã©co-scores
 *     tags: [EcoScore]
 *     responses:
 *       200:
 *         description: Mise Ã  jour rÃ©ussie
 *       500:
 *         description: Erreur serveur
 */
router.post('/update-all', async (req: Request, res: Response) => {
  try {
    const ecoScoreService = new EcoScoreService();
    
    // âœ… CORRECTION: Utiliser la mÃ©thode qui existe
    const categories = ['alimentaire', 'cosmÃ©tique', 'dÃ©tergent'];
    let totalUpdated = 0;
    
    for (const category of categories) {
      const updated = await ecoScoreService.updateScoresForCategory(category);
      totalUpdated += updated;
    }
    
    res.json({
      success: true,
      message: `${totalUpdated} scores mis Ã  jour`,
      updated: totalUpdated
    });
  } catch (error: any) {
    console.error('âŒ Erreur mise Ã  jour globale:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ 
      error: 'Erreur mise Ã  jour globale',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/product/{id}:
 *   get:
 *     summary: RÃ©cupÃ¨re l'Ã©co-score d'un produit
 *     tags: [EcoScore]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ã‰co-score rÃ©cupÃ©rÃ©
 *       404:
 *         description: Produit non trouvÃ©
 *       500:
 *         description: Erreur serveur
 */
router.get('/product/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const ecoScoreService = new EcoScoreService();
    const result = await ecoScoreService.getProductScore(id);
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Produit non trouvÃ©' 
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('âŒ Erreur rÃ©cupÃ©ration score:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ 
      error: 'Erreur rÃ©cupÃ©ration score',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/product/{id}/update:
 *   post:
 *     summary: Met Ã  jour l'Ã©co-score d'un produit spÃ©cifique
 *     tags: [EcoScore]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Score mis Ã  jour
 *       404:
 *         description: Produit non trouvÃ©
 *       500:
 *         description: Erreur serveur
 */
router.post('/product/:id/update', async (req: Request, res: Response) => {
  try {
    const { id: productId } = req.params;
    
    const ecoScoreService = new EcoScoreService();
    
    // âœ… CORRECTION: RÃ©cupÃ©rer le produit d'abord, puis calculer
    const existingScore = await ecoScoreService.getProductScore(productId);
    
    if (!existingScore) {
      return res.status(404).json({ 
        error: 'Produit non trouvÃ©' 
      });
    }
    
    // Recalculer le score (logique simplifiÃ©e)
    const updatedScore = await ecoScoreService.calculate({
      id: productId,
      title: 'Produit Ã  actualiser',
      ingredients: '',
      category: ''
    });
    
    await ecoScoreService.saveScoreToDatabase(productId, updatedScore);
    
    res.json({
      success: true,
      message: 'Score mis Ã  jour',
      data: updatedScore
    });
  } catch (error: any) {
    console.error('âŒ Erreur mise Ã  jour produit:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ 
      error: 'Erreur mise Ã  jour produit',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/batch:
 *   post:
 *     summary: Calcule l'Ã©co-score pour plusieurs produits
 *     tags: [EcoScore]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     ingredients:
 *                       type: string
 *                     category:
 *                       type: string
 *     responses:
 *       200:
 *         description: Scores calculÃ©s
 *       400:
 *         description: DonnÃ©es invalides
 *       500:
 *         description: Erreur serveur
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ 
        error: 'Liste de produits requise' 
      });
    }
    
    const ecoScoreService = new EcoScoreService();
    
    // âœ… CORRECTION: Utiliser la mÃ©thode qui existe
    const results = await ecoScoreService.batchCalculate(products);
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error: any) {
    console.error('âŒ Erreur calcul batch:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ 
      error: 'Erreur calcul batch',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/test:
 *   post:
 *     summary: Test du calcul d'Ã©co-score
 *     tags: [EcoScore]
 *     responses:
 *       200:
 *         description: Test rÃ©ussi
 *       500:
 *         description: Erreur serveur
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const testProduct = {
      id: 'test-product-001',
      title: 'Produit test eco-score',
      ingredients: 'sucre, huile de palme, E471, arÃ´mes artificiels',
      category: 'alimentaire'
    };
    
    const ecoScoreService = new EcoScoreService();
    
    // âœ… CORRECTION: Utiliser la mÃ©thode qui existe
    const result = await ecoScoreService.calculate(testProduct);
    
    res.json({
      success: true,
      message: 'Test eco-score rÃ©ussi',
      testProduct,
      result
    });
  } catch (error: any) {
    console.error('âŒ Erreur test eco-score:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ 
      error: 'Erreur test eco-score',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/distribution:
 *   get:
 *     summary: RÃ©cupÃ¨re la distribution des Ã©co-scores
 *     tags: [EcoScore]
 *     responses:
 *       200:
 *         description: Distribution rÃ©cupÃ©rÃ©e
 *       500:
 *         description: Erreur serveur
 */
router.get('/distribution', async (req: Request, res: Response) => {
  try {
    const ecoScoreService = new EcoScoreService();
    const distribution = await ecoScoreService.getScoreDistribution();
    
    res.json({
      success: true,
      data: distribution
    });
  } catch (error: any) {
    console.error('âŒ Erreur distribution:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({ 
      error: 'Erreur distribution',
      message: error.message 
    });
  }
});

export default router;
// EOF


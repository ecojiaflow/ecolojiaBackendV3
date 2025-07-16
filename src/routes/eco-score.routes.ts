// PATH: backend/src/routes/eco-score.routes.ts
import express from 'express';
import { EcoScoreService } from '../services/eco-score.service';

const router = express.Router();

/**
 * @swagger
 * /api/eco-score/calculate:
 *   post:
 *     summary: Calcule l'éco-score d'un produit
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
 *         description: Éco-score calculé avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
router.post('/calculate', async (req, res) => {
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
    console.error('❌ Erreur calcul eco-score:', error);
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
 *     summary: Met à jour tous les éco-scores
 *     tags: [EcoScore]
 *     responses:
 *       200:
 *         description: Mise à jour réussie
 *       500:
 *         description: Erreur serveur
 */
router.post('/update-all', async (req, res) => {
  try {
    const ecoScoreService = new EcoScoreService();
    
    // ✅ CORRECTION: Utiliser la méthode qui existe
    const categories = ['alimentaire', 'cosmétique', 'détergent'];
    let totalUpdated = 0;
    
    for (const category of categories) {
      const updated = await ecoScoreService.updateScoresForCategory(category);
      totalUpdated += updated;
    }
    
    res.json({
      success: true,
      message: `${totalUpdated} scores mis à jour`,
      updated: totalUpdated
    });
  } catch (error: any) {
    console.error('❌ Erreur mise à jour globale:', error);
    res.status(500).json({ 
      error: 'Erreur mise à jour globale',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/product/{id}:
 *   get:
 *     summary: Récupère l'éco-score d'un produit
 *     tags: [EcoScore]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Éco-score récupéré
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const ecoScoreService = new EcoScoreService();
    const result = await ecoScoreService.getProductScore(id);
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Produit non trouvé' 
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération score:', error);
    res.status(500).json({ 
      error: 'Erreur récupération score',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/product/{id}/update:
 *   post:
 *     summary: Met à jour l'éco-score d'un produit spécifique
 *     tags: [EcoScore]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Score mis à jour
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/product/:id/update', async (req, res) => {
  try {
    const { id: productId } = req.params;
    
    const ecoScoreService = new EcoScoreService();
    
    // ✅ CORRECTION: Récupérer le produit d'abord, puis calculer
    const existingScore = await ecoScoreService.getProductScore(productId);
    
    if (!existingScore) {
      return res.status(404).json({ 
        error: 'Produit non trouvé' 
      });
    }
    
    // Recalculer le score (logique simplifiée)
    const updatedScore = await ecoScoreService.calculate({
      id: productId,
      title: 'Produit à actualiser',
      ingredients: '',
      category: ''
    });
    
    await ecoScoreService.saveScoreToDatabase(productId, updatedScore);
    
    res.json({
      success: true,
      message: 'Score mis à jour',
      data: updatedScore
    });
  } catch (error: any) {
    console.error('❌ Erreur mise à jour produit:', error);
    res.status(500).json({ 
      error: 'Erreur mise à jour produit',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/eco-score/batch:
 *   post:
 *     summary: Calcule l'éco-score pour plusieurs produits
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
 *         description: Scores calculés
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
router.post('/batch', async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ 
        error: 'Liste de produits requise' 
      });
    }
    
    const ecoScoreService = new EcoScoreService();
    
    // ✅ CORRECTION: Utiliser la méthode qui existe
    const results = await ecoScoreService.batchCalculate(products);
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error: any) {
    console.error('❌ Erreur calcul batch:', error);
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
 *     summary: Test du calcul d'éco-score
 *     tags: [EcoScore]
 *     responses:
 *       200:
 *         description: Test réussi
 *       500:
 *         description: Erreur serveur
 */
router.post('/test', async (req, res) => {
  try {
    const testProduct = {
      id: 'test-product-001',
      title: 'Produit test eco-score',
      ingredients: 'sucre, huile de palme, E471, arômes artificiels',
      category: 'alimentaire'
    };
    
    const ecoScoreService = new EcoScoreService();
    
    // ✅ CORRECTION: Utiliser la méthode qui existe
    const result = await ecoScoreService.calculate(testProduct);
    
    res.json({
      success: true,
      message: 'Test eco-score réussi',
      testProduct,
      result
    });
  } catch (error: any) {
    console.error('❌ Erreur test eco-score:', error);
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
 *     summary: Récupère la distribution des éco-scores
 *     tags: [EcoScore]
 *     responses:
 *       200:
 *         description: Distribution récupérée
 *       500:
 *         description: Erreur serveur
 */
router.get('/distribution', async (req, res) => {
  try {
    const ecoScoreService = new EcoScoreService();
    const distribution = await ecoScoreService.getScoreDistribution();
    
    res.json({
      success: true,
      data: distribution
    });
  } catch (error: any) {
    console.error('❌ Erreur distribution:', error);
    res.status(500).json({ 
      error: 'Erreur distribution',
      message: error.message 
    });
  }
});

export default router;
// EOF
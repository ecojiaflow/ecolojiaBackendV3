// PATH: backend/src/routes/admin.routes.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

// Dashboard admin - statistiques imports
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { verified_status: 'verified' } }),
      prisma.product.count({ where: { image_url: { not: null } } }),
      prisma.product.groupBy({
        by: ['category'],
        _count: { category: true }
      })
    ]);

    const [totalProducts, verifiedProducts, productsWithImages, categoryStats] = stats;

    res.json({
      success: true,
      data: {
        totalProducts,
        verifiedProducts,
        productsWithImages,
        categoryBreakdown: categoryStats,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur dashboard admin:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques',
      code: 'ADMIN_DASHBOARD_ERROR'
    });
  }
});

// Logs d'import récents
router.get('/import-logs', async (req, res) => {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    
    if (!fs.existsSync(logsDir)) {
      return res.json({ success: true, data: { logs: [], message: 'Aucun log disponible' } });
    }

    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('import-results-'))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 10);

    const logs = logFiles.map(file => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(logsDir, file), 'utf8'));
        return {
          filename: file,
          timestamp: content.timestamp,
          results: content.results,
          config: content.config
        };
      } catch (error) {
        return null;
      }
    }).filter(log => log !== null);

    res.json({
      success: true,
      data: { logs }
    });

  } catch (error) {
    console.error('Erreur logs import:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des logs',
      code: 'IMPORT_LOGS_ERROR'
    });
  }
});

// Produits récents
router.get('/recent-products', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const recentProducts = await prisma.product.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        brand: true,
        category: true,
        eco_score: true,
        confidence_color: true,
        verified_status: true,
        image_url: true,
        created_at: true
      }
    });

    res.json({
      success: true,
      data: { products: recentProducts }
    });

  } catch (error) {
    console.error('Erreur produits récents:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des produits',
      code: 'RECENT_PRODUCTS_ERROR'
    });
  }
});

// Déclencher nouvel import
router.post('/trigger-import', async (req, res) => {
  try {
    const { maxProducts = 50 } = req.body;

    // Import en arrière-plan (ne pas bloquer la réponse)
    res.json({
      success: true,
      message: `Import de ${maxProducts} produits déclenché`,
      timestamp: new Date().toISOString()
    });

    // TODO: Déclencher import en arrière-plan
    console.log(`🚀 Import de ${maxProducts} produits déclenché via API`);

  } catch (error) {
    console.error('Erreur déclenchement import:', error);
    res.status(500).json({
      error: 'Erreur lors du déclenchement de l\'import',
      code: 'TRIGGER_IMPORT_ERROR'
    });
  }
});

export default router;
// EOF
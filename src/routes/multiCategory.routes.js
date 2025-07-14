// backend/src/routes/multiCategory.routes.js
// Routes pour l'analyse multi-catégories

const express = require('express');
const router = express.Router();

// Import du service principal avec gestion d'erreur
let MultiCategoryRouter;
try {
  MultiCategoryRouter = require('../services/ai/multiCategoryRouter');
} catch (error) {
  console.warn('⚠️ MultiCategoryRouter non disponible:', error.message);
  // Service fallback minimal
  MultiCategoryRouter = class {
    async analyzeProduct(product) {
      return {
        success: true,
        category: 'food',
        analysis: { overall_score: 50 },
        alternatives: []
      };
    }
    getAvailableCategories() { return ['food']; }
    async healthCheck() { return { status: 'fallback' }; }
  };
}

// Initialisation du service
const multiCategoryService = new MultiCategoryRouter();

// === MIDDLEWARE DE VALIDATION ===
const validateProductData = (req, res, next) => {
  const { product } = req.body;
  
  if (!product) {
    return res.status(400).json({
      success: false,
      error: 'Données produit manquantes',
      code: 'MISSING_PRODUCT_DATA',
      expected: {
        product: {
          title: 'string (requis)',
          brand: 'string (optionnel)',
          description: 'string (optionnel)',
          ingredients: 'array (optionnel)',
          barcode: 'string (optionnel)'
        },
        context: {
          userId: 'string (optionnel)',
          anonymousId: 'string (optionnel)'
        }
      }
    });
  }

  // Validation basique du format
  if (typeof product !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Format produit invalide - objet JSON attendu',
      code: 'INVALID_PRODUCT_FORMAT'
    });
  }

  // S'assurer qu'on a au minimum un titre ou un code-barres
  if (!product.title && !product.barcode) {
    return res.status(400).json({
      success: false,
      error: 'Titre ou code-barres requis pour l\'analyse',
      code: 'INSUFFICIENT_PRODUCT_DATA'
    });
  }

  next();
};

// === ROUTE PRINCIPALE : ANALYSE MULTI-CATÉGORIES ===
router.post('/analyze', validateProductData, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { product, context = {} } = req.body;
    
    console.log(`🔍 Nouvelle analyse multi-catégories: ${product.title || product.barcode || 'Produit'}`);

    // Enrichir le contexte avec les données de la requête
    const enrichedContext = {
      ...context,
      startTime,
      userId: context.userId || req.headers['x-user-id'] || req.ip,
      anonymousId: context.anonymousId || req.headers['x-anonymous-id'],
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Log pour débuggage
    console.log('Context enrichi:', {
      userId: enrichedContext.userId,
      anonymousId: enrichedContext.anonymousId,
      requestId: enrichedContext.requestId
    });

    // Appel du service d'analyse multi-catégories
    const result = await multiCategoryService.analyzeProduct(product, enrichedContext);

    // Ajout des métadonnées de réponse
    const response = {
      ...result,
      metadata: {
        ...result.metadata,
        processing_time_ms: Date.now() - startTime,
        api_version: '3.0-multicategory',
        request_id: enrichedContext.requestId,
        timestamp: new Date().toISOString(),
        server_time: Date.now()
      }
    };

    // Log de succès
    console.log(`✅ Analyse terminée en ${response.metadata.processing_time_ms}ms - Catégorie: ${result.category} - Confiance: ${Math.round((result.detection_confidence || 0) * 100)}%`);

    res.json(response);

  } catch (error) {
    console.error('❌ Erreur analyse multi-catégories:', error);

    // Structure d'erreur standardisée
    const errorResponse = {
      success: false,
      error: error.message || 'Erreur interne du serveur',
      code: error.code || 'MULTICATEGORY_ANALYSIS_ERROR',
      category: error.category || 'unknown',
      metadata: {
        processing_time_ms: Date.now() - startTime,
        request_id: req.headers['x-request-id'] || `err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        api_version: '3.0-multicategory'
      }
    };

    // Ajouter détails en développement
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = error;
    }

    // Code HTTP selon le type d'erreur
    let statusCode = 500;
    if (error.message?.includes('Quota')) statusCode = 429;
    if (error.message?.includes('manquantes') || error.message?.includes('invalide')) statusCode = 400;
    if (error.message?.includes('non disponible')) statusCode = 503;

    res.status(statusCode).json(errorResponse);
  }
});

// === ROUTE : DÉTECTION DE CATÉGORIE SEULE ===
router.post('/detect-category', validateProductData, async (req, res) => {
  try {
    const { product } = req.body;

    console.log(`🔍 Détection catégorie pour: ${product.title || product.barcode || 'Produit'}`);

    // Si le service a une méthode de détection directe
    if (typeof multiCategoryService.detectProductCategory === 'function') {
      const detection = await multiCategoryService.detectProductCategory(product);
      res.json({
        success: true,
        ...detection,
        timestamp: new Date().toISOString(),
        api_version: '3.0-multicategory'
      });
    } else {
      // Fallback : analyse complète mais ne retourner que la catégorie
      const result = await multiCategoryService.analyzeProduct(product, { 
        userId: 'category_detection_only',
        mode: 'detection_only'
      });
      
      res.json({
        success: true,
        category: result.category,
        confidence: result.detection_confidence || 0.5,
        method: 'full_analysis_fallback',
        timestamp: new Date().toISOString(),
        api_version: '3.0-multicategory'
      });
    }

  } catch (error) {
    console.error('❌ Erreur détection catégorie:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CATEGORY_DETECTION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// === ROUTE : LISTE DES CATÉGORIES DISPONIBLES ===
router.get('/categories', async (req, res) => {
  try {
    const categories = multiCategoryService.getAvailableCategories();
    
    // Informations détaillées sur chaque catégorie
    const categoriesInfo = {
      food: {
        name: 'Alimentaire',
        description: 'Analyse nutritionnelle, additifs, ultra-transformation',
        icon: '🍎',
        color: '#7DDE4A',
        features: ['Classification NOVA', 'Index glycémique', 'Additifs', 'Nutri-Score']
      },
      cosmetics: {
        name: 'Cosmétiques',
        description: 'Analyse INCI, allergènes, perturbateurs endocriniens',
        icon: '💄',
        color: '#FF69B4',
        features: ['Ingrédients INCI', 'Allergènes', 'Sécurité cutanée', 'Perturbateurs endocriniens']
      },
      detergents: {
        name: 'Détergents',
        description: 'Impact respiratoire, aquatique, biodégradabilité',
        icon: '🧽',
        color: '#4FC3F7',
        features: ['Sécurité respiratoire', 'Impact aquatique', 'Biodégradabilité', 'COV']
      }
    };

    const response = {
      success: true,
      categories: categories.map(cat => ({
        id: cat,
        ...categoriesInfo[cat],
        available: true
      })),
      total_categories: categories.length,
      default_category: 'food',
      api_version: '3.0-multicategory',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Erreur récupération catégories:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      code: 'CATEGORIES_FETCH_ERROR'
    });
  }
});

// === ROUTE : SANTÉ DU SYSTÈME MULTI-CATÉGORIES ===
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await multiCategoryService.healthCheck();
    
    const isHealthy = healthCheck.status === 'healthy' || healthCheck.status === 'basic';
    const httpStatus = isHealthy ? 200 : 503;
    
    const response = {
      ...healthCheck,
      api_version: '3.0-multicategory',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };

    res.status(httpStatus).json(response);
    
  } catch (error) {
    console.error('❌ Erreur health check:', error);
    res.status(503).json({
      service: 'MultiCategoryRouter',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// === ROUTE : STATISTIQUES D'UTILISATION ===
router.get('/stats', async (req, res) => {
  try {
    // Statistiques basiques (à enrichir selon vos besoins)
    const stats = {
      service: 'MultiCategoryRouter',
      available_categories: multiCategoryService.getAvailableCategories(),
      total_categories: multiCategoryService.getAvailableCategories().length,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      node_version: process.version,
      api_version: '3.0-multicategory',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'STATS_ERROR'
    });
  }
});

// === ROUTE : TEST DE DÉTECTION (POUR DÉVELOPPEMENT) ===
router.post('/test-detection', validateProductData, async (req, res) => {
  try {
    const { product } = req.body;
    
    // Import direct du service de détection pour tests
    const categoryDetection = require('../data/categoryDetection');
    
    const detectionResult = await categoryDetection.detectCategory(product);
    const detectionStats = categoryDetection.getDetectionStats();
    
    res.json({
      success: true,
      product_analyzed: {
        title: product.title,
        brand: product.brand,
        has_ingredients: Array.isArray(product.ingredients),
        has_description: !!product.description
      },
      detection_result: detectionResult,
      detection_stats: detectionStats,
      timestamp: new Date().toISOString(),
      mode: 'development_test'
    });

  } catch (error) {
    console.error('❌ Erreur test détection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'TEST_DETECTION_ERROR'
    });
  }
});

// === MIDDLEWARE DE GESTION D'ERREURS ===
router.use((error, req, res, next) => {
  console.error('❌ Erreur middleware multiCategory:', error);
  
  res.status(500).json({
    success: false,
    error: 'Erreur interne du service multi-catégories',
    code: 'MULTICATEGORY_MIDDLEWARE_ERROR',
    timestamp: new Date().toISOString(),
    // Détails uniquement en développement
    ...(process.env.NODE_ENV === 'development' && { 
      details: error.message,
      stack: error.stack 
    })
  });
});

module.exports = router;
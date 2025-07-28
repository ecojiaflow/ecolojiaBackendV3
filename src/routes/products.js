// backend/src/routes/products.js
const express = require('express');
const router = express.Router();
const { authenticateUser, checkPremium } = require('../middleware/auth');
const Product = require('../models/Product');
const Analysis = require('../models/Analysis');
const { asyncHandler } = require('../utils/errors');
const logger = require('../utils/logger');
const { analyzeProduct } = require('../services/productAnalysisService');
const { searchProducts } = require('../services/searchService');

// GET /api/products/search - Recherche de produits
router.get('/search', asyncHandler(async (req, res) => {
  const { q, category, page = 1, limit = 20 } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query must be at least 2 characters'
    });
  }
  
  logger.info('Product search', { query: q, category });
  
  // Recherche dans la base MongoDB
  const searchQuery = {
    $text: { $search: q }
  };
  
  if (category) {
    searchQuery.category = category;
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [products, total] = await Promise.all([
    Product.find(searchQuery)
      .select('name brand barcode imageUrl category analysisData.healthScore')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parseInt(limit)),
    Product.countDocuments(searchQuery)
  ]);
  
  res.json({
    success: true,
    products,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: parseInt(page) * parseInt(limit) < total,
      hasPrev: parseInt(page) > 1
    }
  });
}));

// GET /api/products/barcode/:barcode - Recherche par code-barres
router.get('/barcode/:barcode', asyncHandler(async (req, res) => {
  const { barcode } = req.params;
  
  logger.info('Barcode lookup', { barcode });
  
  // Chercher dans la base locale
  let product = await Product.findByBarcode(barcode);
  
  if (!product) {
    // Si pas trouvé localement, chercher sur OpenFoodFacts
    logger.info('Product not found locally, checking OpenFoodFacts', { barcode });
    
    try {
      const offProduct = await searchProducts.searchOpenFoodFacts(barcode);
      
      if (offProduct) {
        // Créer le produit dans notre base
        product = await Product.create({
          barcode: offProduct.barcode,
          name: offProduct.name,
          brand: offProduct.brand,
          category: 'food', // OpenFoodFacts = alimentaire
          imageUrl: offProduct.imageUrl,
          foodData: {
            ingredients: offProduct.ingredients || [],
            nutritionalInfo: offProduct.nutritionalInfo || {},
            novaScore: offProduct.novaScore,
            nutriScore: offProduct.nutriScore
          }
        });
        
        logger.info('Product imported from OpenFoodFacts', { barcode, name: product.name });
      }
    } catch (error) {
      logger.error('OpenFoodFacts search failed', { barcode, error: error.message });
    }
  }
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }
  
  // Incrémenter le compteur de vues
  await product.incrementView();
  
  res.json({
    success: true,
    product: product.getPublicData()
  });
}));

// POST /api/products/analyze - Analyser un produit
router.post('/analyze', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { productId, barcode, manualData, category = 'food' } = req.body;
  
  logger.info('Product analysis request', { userId, productId, barcode, category });
  
  // Vérifier les quotas
  const user = await req.user;
  if (!user.checkQuota('analyses')) {
    return res.status(403).json({
      success: false,
      error: 'Quota exceeded',
      quotas: user.quotas,
      usage: user.usage
    });
  }
  
  let product;
  
  // 1. Recherche du produit
  if (productId) {
    product = await Product.findById(productId);
  } else if (barcode) {
    product = await Product.findByBarcode(barcode);
    
    // Si pas trouvé, essayer OpenFoodFacts
    if (!product) {
      const offProduct = await searchProducts.searchOpenFoodFacts(barcode);
      if (offProduct) {
        product = await Product.create({
          ...offProduct,
          category
        });
      }
    }
  } else if (manualData) {
    // Création manuelle du produit
    product = await Product.create({
      name: manualData.name,
      brand: manualData.brand,
      category,
      [`${category}Data`]: manualData.specificData || {}
    });
  }
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found or could not be created'
    });
  }
  
  // 2. Analyser le produit
  const analysisResult = await analyzeProduct(product, {
    userId,
    useAI: user.tier === 'premium',
    category
  });
  
  // 3. Sauvegarder l'analyse
  const analysis = await Analysis.create({
    userId,
    productId: product._id,
    productSnapshot: {
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      imageUrl: product.imageUrl,
      category: product.category
    },
    analysisType: barcode ? 'barcode_scan' : 'manual_entry',
    results: analysisResult,
    metadata: {
      appVersion: '3.0',
      platform: 'web',
      aiModel: user.tier === 'premium' ? 'deepseek' : 'internal'
    }
  });
  
  // 4. Incrémenter l'usage
  await user.incrementUsage('analyses');
  
  // 5. Mettre à jour le produit avec les résultats
  product.analysisData = {
    healthScore: analysisResult.healthScore,
    lastAnalyzedAt: new Date(),
    version: '3.0',
    confidence: analysisResult.confidence || 0.8
  };
  product.scanCount++;
  await product.save();
  
  logger.info('Product analyzed successfully', { 
    userId, 
    productId: product._id,
    healthScore: analysisResult.healthScore 
  });
  
  res.json({
    success: true,
    product: product.getPublicData(),
    analysis: {
      id: analysis._id,
      results: analysisResult,
      createdAt: analysis.createdAt
    }
  });
}));

// GET /api/products/:id - Détails d'un produit
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }
  
  // Incrémenter le compteur de vues
  await product.incrementView();
  
  res.json({
    success: true,
    product: product.getPublicData()
  });
}));

// POST /api/products/:id/report - Signaler un problème sur un produit
router.post('/:id/report', authenticateUser, asyncHandler(async (req, res) => {
  const { reason, description } = req.body;
  const productId = req.params.id;
  const userId = req.userId;
  
  if (!reason) {
    return res.status(400).json({
      success: false,
      error: 'Report reason is required'
    });
  }
  
  logger.info('Product reported', { productId, userId, reason });
  
  // TODO: Implémenter le système de signalement
  // Pour l'instant, on log juste
  
  res.json({
    success: true,
    message: 'Report submitted successfully'
  });
}));

// GET /api/products/trending - Produits populaires
router.get('/trending', asyncHandler(async (req, res) => {
  const { category, limit = 10 } = req.query;
  
  const query = {};
  if (category) {
    query.category = category;
  }
  
  const trendingProducts = await Product.find(query)
    .select('name brand imageUrl category analysisData.healthScore viewCount scanCount')
    .sort({ scanCount: -1, viewCount: -1 })
    .limit(parseInt(limit));
  
  res.json({
    success: true,
    products: trendingProducts
  });
}));

// GET /api/products/:id/alternatives - Alternatives plus saines
router.get('/:id/alternatives', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }
  
  // Chercher des alternatives dans la même catégorie avec un meilleur score
  const alternatives = await Product.find({
    category: product.category,
    'analysisData.healthScore': { $gt: product.analysisData?.healthScore || 0 },
    _id: { $ne: product._id }
  })
    .select('name brand imageUrl analysisData.healthScore')
    .sort({ 'analysisData.healthScore': -1 })
    .limit(5);
  
  res.json({
    success: true,
    currentProduct: {
      id: product._id,
      name: product.name,
      healthScore: product.analysisData?.healthScore || 0
    },
    alternatives: alternatives.map(alt => ({
      id: alt._id,
      name: alt.name,
      brand: alt.brand,
      imageUrl: alt.imageUrl,
      healthScore: alt.analysisData?.healthScore || 0,
      improvement: (alt.analysisData?.healthScore || 0) - (product.analysisData?.healthScore || 0)
    }))
  });
}));

// POST /api/products - Créer un produit manuellement (admin ou premium)
router.post('/', authenticateUser, checkPremium, asyncHandler(async (req, res) => {
  const { name, brand, category, barcode, specificData } = req.body;
  
  // Validation
  if (!name || !category) {
    return res.status(400).json({
      success: false,
      error: 'Name and category are required'
    });
  }
  
  if (!['food', 'cosmetics', 'detergents'].includes(category)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid category'
    });
  }
  
  // Vérifier si le code-barres existe déjà
  if (barcode) {
    const existing = await Product.findByBarcode(barcode);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Product with this barcode already exists',
        product: existing
      });
    }
  }
  
  // Créer le produit
  const productData = {
    name,
    brand,
    category,
    barcode,
    [`${category}Data`]: specificData || {}
  };
  
  const product = await Product.create(productData);
  
  logger.info('Product created manually', { 
    productId: product._id, 
    name, 
    category,
    userId: req.userId 
  });
  
  res.status(201).json({
    success: true,
    product: product.getPublicData()
  });
}));

module.exports = router;
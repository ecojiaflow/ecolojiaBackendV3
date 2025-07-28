// backend/src/routes/favorites.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Favorite = require('../models/Favorite');
const Product = require('../models/Product');
const { asyncHandler } = require('../utils/errors');
const logger = require('../utils/logger');

// GET /api/favorites - Liste des favoris
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { category, tags, page = 1, limit = 20 } = req.query;
  
  const favorites = await Favorite.getUserFavorites(userId, {
    category,
    tags: tags ? tags.split(',') : [],
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  res.json({
    success: true,
    favorites
  });
}));

// POST /api/favorites/toggle - Ajouter/Retirer des favoris
router.post('/toggle', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { productId } = req.body;
  
  if (!productId) {
    return res.status(400).json({
      success: false,
      error: 'Product ID is required'
    });
  }
  
  // Récupérer les données du produit pour le snapshot
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }
  
  const productData = {
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    imageUrl: product.imageUrl,
    category: product.category,
    healthScore: product.analysisData?.healthScore
  };
  
  const result = await Favorite.toggleFavorite(userId, productId, productData);
  
  logger.info(`Favorite toggled for user ${userId}, product ${productId}`, result);
  
  res.json({
    success: true,
    ...result
  });
}));

// PUT /api/favorites/:id - Mettre à jour un favori
router.put('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const { notes, tags, notifications } = req.body;
  
  const favorite = await Favorite.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.userId
    },
    {
      $set: {
        ...(notes !== undefined && { notes }),
        ...(tags && { tags }),
        ...(notifications && { notifications }),
        lastViewedAt: new Date()
      }
    },
    { new: true }
  );
  
  if (!favorite) {
    return res.status(404).json({
      success: false,
      error: 'Favorite not found'
    });
  }
  
  res.json({
    success: true,
    favorite
  });
}));

// GET /api/favorites/check/:productId - Vérifier si un produit est en favori
router.get('/check/:productId', authenticateUser, asyncHandler(async (req, res) => {
  const favorite = await Favorite.findOne({
    userId: req.userId,
    productId: req.params.productId
  });
  
  res.json({
    success: true,
    isFavorite: !!favorite,
    favorite
  });
}));

module.exports = router;
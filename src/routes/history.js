// backend/src/routes/history.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const { asyncHandler } = require('../utils/errors');
const logger = require('../utils/logger');

// GET /api/history - Récupérer l'historique utilisateur
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const {
    page = 1,
    limit = 20,
    category,
    minScore,
    maxScore,
    startDate,
    endDate
  } = req.query;
  
  logger.info(`Fetching history for user ${userId}`, { page, limit, category });
  
  const result = await Analysis.getUserHistory(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    category,
    minScore: minScore ? parseInt(minScore) : null,
    maxScore: maxScore ? parseInt(maxScore) : null,
    startDate,
    endDate
  });
  
  res.json({
    success: true,
    ...result
  });
}));

// GET /api/history/stats - Statistiques utilisateur
router.get('/stats', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { period = 30 } = req.query;
  
  const stats = await Analysis.getUserStats(userId, parseInt(period));
  
  res.json({
    success: true,
    stats
  });
}));

// GET /api/history/:id - Détails d'une analyse
router.get('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const analysis = await Analysis.findOne({
    _id: req.params.id,
    userId: req.userId
  }).populate('productId', 'name brand imageUrl');
  
  if (!analysis) {
    return res.status(404).json({
      success: false,
      error: 'Analysis not found'
    });
  }
  
  res.json({
    success: true,
    analysis
  });
}));

// DELETE /api/history/:id - Supprimer une analyse
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const result = await Analysis.deleteOne({
    _id: req.params.id,
    userId: req.userId
  });
  
  if (result.deletedCount === 0) {
    return res.status(404).json({
      success: false,
      error: 'Analysis not found'
    });
  }
  
  logger.info(`Analysis ${req.params.id} deleted by user ${req.userId}`);
  
  res.json({
    success: true,
    message: 'Analysis deleted successfully'
  });
}));

module.exports = router;
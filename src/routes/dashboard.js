// PATH: backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authenticateUser, checkPremium } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');
const logger = require('../utils/logger');

// ✅ Services importés
const {
  getUserStats,
  getTopProducts,
  getScoresByCategory,
  getCategoryTrends,
  calculateAchievements,
  generatePersonalizedRecommendations,
  generateWeeklySummary
} = require('../services/productAnalysisService');

const {
  getHealthScoreTrend,
  analyzeProgress,
  generateInsights,
  getCommunityStats,
  calculatePercentile,
  getComparisonMessage
} = require('../services/eco-score.service');

// ✅ GET /api/dashboard/stats
router.get('/stats', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { period = 30 } = req.query;
  
  logger.info('Dashboard stats requested', { userId, period });

  const userStats = await getUserStats(userId, parseInt(period));
  const dailyAnalyses = await getDailyAnalyses(userId, parseInt(period));
  const categoryBreakdown = await getCategoryBreakdown(userId, parseInt(period));
  const topProducts = await getTopProducts(userId, 5);
  const scoresByCategory = await getScoresByCategory(userId, parseInt(period));

  res.json({
    success: true,
    stats: {
      overview: userStats,
      dailyAnalyses,
      categoryBreakdown,
      topProducts,
      scoresByCategory,
      period: parseInt(period)
    }
  });
}));

// ✅ GET /api/dashboard/trends
router.get('/trends', authenticateUser, checkPremium, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { period = 90 } = req.query;

  logger.info('Dashboard trends requested', { userId, period });

  const healthScoreTrend = await getHealthScoreTrend(userId, parseInt(period));
  const progressAnalysis = analyzeProgress(healthScoreTrend);
  const categoryTrends = await getCategoryTrends(userId, parseInt(period));
  const insights = await generateInsights(userId, healthScoreTrend, categoryTrends);

  res.json({
    success: true,
    trends: {
      healthScoreTrend,
      progressAnalysis,
      categoryTrends,
      insights,
      period: parseInt(period)
    }
  });
}));

// ✅ GET /api/dashboard/achievements
router.get('/achievements', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const achievements = await calculateAchievements(userId);

  res.json({
    success: true,
    achievements
  });
}));

// ✅ GET /api/dashboard/recommendations
router.get('/recommendations', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;

  const recentAnalyses = await getTopProducts(userId, 20); // réutilisation top
  const stats = await getUserStats(userId, 30);
  const recommendations = generatePersonalizedRecommendations(recentAnalyses, stats);

  res.json({
    success: true,
    recommendations
  });
}));

// ✅ GET /api/dashboard/comparison
router.get('/comparison', authenticateUser, checkPremium, asyncHandler(async (req, res) => {
  const userId = req.userId;

  const userStats = await getUserStats(userId, 30);
  const communityStats = await getCommunityStats();
  const percentile = calculatePercentile(userStats.avgHealthScore, communityStats.scoreDistribution);

  res.json({
    success: true,
    comparison: {
      user: {
        avgHealthScore: userStats.avgHealthScore,
        totalAnalyses: userStats.totalAnalyses
      },
      community: {
        avgHealthScore: communityStats.avgHealthScore,
        totalUsers: communityStats.totalUsers,
        totalAnalyses: communityStats.totalAnalyses
      },
      percentile,
      message: getComparisonMessage(percentile)
    }
  });
}));

// ✅ GET /api/dashboard/weekly-summary
router.get('/weekly-summary', authenticateUser, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const summary = await generateWeeklySummary(userId);

  res.json({
    success: true,
    summary
  });
}));

// ✅ Fonctions locales MongoDB : dailyAnalyses et categoryBreakdown
async function getDailyAnalyses(userId, days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const Analysis = mongoose.model('Analysis');
  const results = await Analysis.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
        avgScore: { $avg: "$results.healthScore" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const output = [];
  const current = new Date(startDate);
  const today = new Date();
  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    const entry = results.find(r => r._id === dateStr);
    output.push({
      date: dateStr,
      count: entry?.count || 0,
      avgScore: entry?.avgScore || 0
    });
    current.setDate(current.getDate() + 1);
  }

  return output;
}

async function getCategoryBreakdown(userId, days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const Analysis = mongoose.model('Analysis');
  return await Analysis.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: "$productSnapshot.category",
        count: { $sum: 1 },
        avgScore: { $avg: "$results.healthScore" }
      }
    },
    {
      $project: {
        category: "$_id",
        count: 1,
        avgScore: { $round: ["$avgScore", 1] },
        _id: 0
      }
    }
  ]);
}

module.exports = router;
// EOF

// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Middleware auth - avec fallback si n'existe pas
let auth;
try {
  auth = require('../middleware/auth');
} catch (error) {
  console.log('Auth middleware not found, using fallback');
  auth = (req, res, next) => {
    // Pour les tests, on simule un userId
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      req.userId = authHeader.substring(7);
    } else {
      req.userId = '507f1f77bcf86cd799439011'; // ID MongoDB par défaut pour tests
    }
    next();
  };
}

// Import des modèles
const User = require('../models/User');
const Analysis = require('../models/Analysis');

// ✅ GET /api/dashboard/stats - Route principale du dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { range = 'month' } = req.query;
    
    console.log('Dashboard stats requested for user:', userId);

    // Calculer la date de début selon la période
    const startDate = new Date();
    switch (range) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Récupérer l'utilisateur
    let user;
    try {
      user = await User.findById(userId);
    } catch (error) {
      console.log('User not found, using default data');
      user = {
        _id: userId,
        name: 'Utilisateur Test',
        email: 'test@example.com',
        tier: 'free',
        currentStreak: 0,
        bestStreak: 0
      };
    }

    if (!user) {
      user = {
        _id: userId,
        name: 'Utilisateur Test',
        email: 'test@example.com',
        tier: 'free',
        currentStreak: 0,
        bestStreak: 0
      };
    }

    // Récupérer les analyses de l'utilisateur pour la période
    let analyses = [];
    try {
      analyses = await Analysis.find({
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.log('Error fetching analyses:', error.message);
      analyses = [];
    }

    console.log(`Found ${analyses.length} analyses for user ${userId}`);

    // Calculer les statistiques de base
    const totalAnalyses = analyses.length;
    const scores = analyses
      .map(a => a.results?.healthScore || a.healthScore || 75)
      .filter(score => score > 0);
    
    const avgHealthScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
      : 75;
    const minHealthScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxHealthScore = scores.length > 0 ? Math.max(...scores) : 100;

    // Compter par catégorie
    const categories = {
      food: 0,
      cosmetics: 0,
      detergents: 0
    };

    analyses.forEach(analysis => {
      const category = analysis.productSnapshot?.category || analysis.category || 'food';
      if (categories.hasOwnProperty(category)) {
        categories[category]++;
      }
    });

    // Analyses récentes (5 dernières)
    const recentAnalyses = analyses.slice(0, 5).map(analysis => ({
      id: analysis._id.toString(),
      productName: analysis.productSnapshot?.name || analysis.productName || 'Produit',
      category: analysis.productSnapshot?.category || analysis.category || 'food',
      healthScore: analysis.results?.healthScore || analysis.healthScore || 75,
      date: analysis.createdAt.toISOString(),
      trend: 'stable',
      alternatives: analysis.alternatives?.length || 0
    }));

    // Calculer les tendances (simplifiées pour l'instant)
    let previousPeriodAnalyses = [];
    try {
      previousPeriodAnalyses = await Analysis.find({
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { 
          $gte: new Date(startDate.getTime() - (Date.now() - startDate.getTime())),
          $lt: startDate 
        }
      });
    } catch (error) {
      console.log('Error fetching previous period analyses');
    }

    const previousScores = previousPeriodAnalyses
      .map(a => a.results?.healthScore || a.healthScore || 75)
      .filter(score => score > 0);
    
    const previousAvg = previousScores.length > 0
      ? Math.round(previousScores.reduce((a, b) => a + b) / previousScores.length)
      : avgHealthScore;

    const improvement = avgHealthScore - previousAvg;

    // Recommandations basées sur les données
    const recommendations = [];
    
    if (totalAnalyses === 0) {
      recommendations.push({
        id: '1',
        type: 'welcome',
        title: 'Bienvenue sur ECOLOJIA !',
        description: 'Commencez par scanner votre premier produit',
        impact: 'high',
        icon: '🎉',
        cta: 'Scanner un produit'
      });
    } else {
      if (avgHealthScore < 60) {
        recommendations.push({
          id: '1',
          type: 'health',
          title: 'Améliorez votre score santé',
          description: `Votre score moyen est de ${avgHealthScore}/100. Essayez des alternatives plus saines.`,
          impact: 'high',
          icon: '🍎',
          cta: 'Voir les alternatives'
        });
      }
      
      if (categories.cosmetics === 0 && totalAnalyses > 5) {
        recommendations.push({
          id: '2',
          type: 'diversity',
          title: 'Essayez les cosmétiques',
          description: 'Analysez aussi vos produits cosmétiques pour une vue complète',
          impact: 'medium',
          icon: '🧴',
          cta: 'Scanner un cosmétique'
        });
      }
    }

    // Ajouter une recommandation Premium si pas Premium
    if (user.tier !== 'premium') {
      recommendations.push({
        id: '99',
        type: 'premium',
        title: 'Passez à Premium',
        description: 'Débloquez le chat IA et les analyses illimitées',
        impact: 'medium',
        icon: '⭐',
        cta: 'Découvrir Premium'
      });
    }

    // Achievements simples
    const achievements = [
      {
        id: '1',
        title: 'Première analyse',
        description: 'Vous avez scanné votre premier produit',
        icon: '🎯',
        unlockedAt: totalAnalyses > 0 ? analyses[analyses.length - 1].createdAt : null,
        progress: Math.min(totalAnalyses, 1),
        maxProgress: 1
      },
      {
        id: '2',
        title: 'Explorateur',
        description: 'Analysez 10 produits',
        icon: '🔍',
        unlockedAt: totalAnalyses >= 10 ? new Date() : null,
        progress: Math.min(totalAnalyses, 10),
        maxProgress: 10
      },
      {
        id: '3',
        title: 'Expert santé',
        description: 'Atteignez un score moyen de 80+',
        icon: '🏆',
        unlockedAt: avgHealthScore >= 80 ? new Date() : null,
        progress: avgHealthScore,
        maxProgress: 80
      }
    ];

    // Résumé hebdomadaire
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyAnalyses = analyses.filter(a => a.createdAt >= weekAgo);
    const weeklyScores = weeklyAnalyses
      .map(a => a.results?.healthScore || a.healthScore || 75)
      .filter(score => score > 0);
    
    const weeklyAvg = weeklyScores.length > 0
      ? Math.round(weeklyScores.reduce((a, b) => a + b) / weeklyScores.length)
      : 0;

    // Trouver le meilleur et le pire produit de la semaine
    let bestProduct = { name: 'Aucun produit scanné', score: 0 };
    let worstProduct = { name: 'Aucun produit scanné', score: 0 };
    
    if (weeklyAnalyses.length > 0) {
      const sortedByScore = [...weeklyAnalyses].sort((a, b) => 
        (b.results?.healthScore || b.healthScore || 0) - (a.results?.healthScore || a.healthScore || 0)
      );
      
      bestProduct = {
        name: sortedByScore[0].productSnapshot?.name || sortedByScore[0].productName || 'Produit',
        score: sortedByScore[0].results?.healthScore || sortedByScore[0].healthScore || 0
      };
      
      worstProduct = {
        name: sortedByScore[sortedByScore.length - 1].productSnapshot?.name || sortedByScore[sortedByScore.length - 1].productName || 'Produit',
        score: sortedByScore[sortedByScore.length - 1].results?.healthScore || sortedByScore[sortedByScore.length - 1].healthScore || 0
      };
    }

    // Construire la réponse complète
    const statsResponse = {
      overview: {
        totalAnalyses,
        avgHealthScore,
        minHealthScore,
        maxHealthScore,
        categories
      },
      trends: {
        healthScoreImprovement: improvement,
        comparedToLastMonth: improvement > 0 ? Math.round((improvement / previousAvg) * 100) : 0,
        currentStreak: user.currentStreak || 0,
        bestStreak: user.bestStreak || 0
      },
      recommendations,
      recentAnalyses,
      achievements,
      community: {
        averageScore: 72, // Valeur fixe pour l'instant
        userRank: Math.floor(Math.random() * 1000) + 1,
        totalUsers: 5000,
        topCategory: 'Alimentaire'
      },
      weeklyDigest: {
        scansCount: weeklyAnalyses.length,
        avgScore: weeklyAvg,
        bestProduct,
        worstProduct,
        discoveries: weeklyAnalyses.length,
        alternatives: weeklyAnalyses.reduce((sum, a) => sum + (a.alternatives?.length || 0), 0)
      }
    };

    console.log('Sending dashboard stats:', {
      totalAnalyses: statsResponse.overview.totalAnalyses,
      avgScore: statsResponse.overview.avgHealthScore
    });

    res.json(statsResponse);

  } catch (error) {
    console.error('Erreur dashboard stats:', error);
    res.status(500).json({ 
      error: 'Erreur lors du chargement des statistiques',
      message: error.message 
    });
  }
});

// ✅ GET /api/dashboard/export - Export des données
router.get('/export', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { format = 'csv' } = req.query;

    // Pour l'instant, retourner un message
    res.json({ 
      message: 'Export en cours de développement',
      format,
      info: 'Cette fonctionnalité sera disponible prochainement'
    });

  } catch (error) {
    console.error('Erreur export:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

module.exports = router;
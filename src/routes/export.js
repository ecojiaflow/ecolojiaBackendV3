// backend/src/routes/export.js
const express = require('express');
const router = express.Router();
const { authenticateUser, checkPremium } = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const { asyncHandler } = require('../utils/errors');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Helper pour générer le PDF
async function generatePDF(user, analyses, filters) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Header
      doc.fontSize(24)
         .fillColor('#00695C')
         .text('ECOLOJIA', { align: 'center' });
      
      doc.fontSize(16)
         .fillColor('#333')
         .text('Rapport d\'Analyse Personnel', { align: 'center' });
      
      doc.moveDown();
      
      // Informations utilisateur
      doc.fontSize(10)
         .fillColor('#666')
         .text(`Généré pour : ${user.name}`, 50, 120)
         .text(`Email : ${user.email}`)
         .text(`Date : ${new Date().toLocaleDateString('fr-FR')}`)
         .text(`Période : ${filters.startDate || 'Début'} - ${filters.endDate || 'Aujourd\'hui'}`);
      
      doc.moveDown(2);
      
      // Statistiques globales
      const stats = calculateStats(analyses);
      
      doc.fontSize(14)
         .fillColor('#00695C')
         .text('Statistiques Globales', { underline: true });
      
      doc.fontSize(10)
         .fillColor('#333')
         .text(`Nombre total d'analyses : ${stats.totalAnalyses}`)
         .text(`Score santé moyen : ${stats.avgHealthScore}/100`)
         .text(`Meilleur score : ${stats.maxScore}/100`)
         .text(`Score le plus bas : ${stats.minScore}/100`)
         .text(`Catégories analysées : ${stats.categories.join(', ')}`);
      
      doc.moveDown(2);
      
      // Liste des analyses
      doc.fontSize(14)
         .fillColor('#00695C')
         .text('Historique des Analyses', { underline: true });
      
      doc.moveDown();
      
      // Table header
      const tableTop = doc.y;
      const tableHeaders = ['Date', 'Produit', 'Marque', 'Catégorie', 'Score'];
      const columnWidths = [80, 180, 100, 80, 60];
      let currentX = 50;
      
      doc.fontSize(10)
         .fillColor('#fff');
      
      // Fond header
      doc.rect(50, tableTop - 5, 500, 20)
         .fill('#00695C');
      
      // Headers text
      tableHeaders.forEach((header, i) => {
        doc.fillColor('#fff')
           .text(header, currentX, tableTop, {
             width: columnWidths[i],
             align: 'left'
           });
        currentX += columnWidths[i];
      });
      
      doc.moveDown();
      
      // Rows
      let currentY = doc.y;
      analyses.forEach((analysis, index) => {
        // Alterner les couleurs de fond
        if (index % 2 === 0) {
          doc.rect(50, currentY - 5, 500, 20)
             .fill('#f5f5f5');
        }
        
        currentX = 50;
        const rowData = [
          new Date(analysis.createdAt).toLocaleDateString('fr-FR'),
          analysis.productSnapshot.name.substring(0, 30),
          analysis.productSnapshot.brand || '-',
          analysis.productSnapshot.category,
          `${analysis.results.healthScore}/100`
        ];
        
        doc.fillColor('#333');
        rowData.forEach((data, i) => {
          doc.text(data, currentX, currentY, {
            width: columnWidths[i],
            align: 'left'
          });
          currentX += columnWidths[i];
        });
        
        currentY += 20;
        
        // Nouvelle page si nécessaire
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });
      
      // Footer
      doc.fontSize(8)
         .fillColor('#999')
         .text(
           'Ce rapport est généré automatiquement par ECOLOJIA. Les analyses sont basées sur des données scientifiques publiques.',
           50,
           750,
           { align: 'center', width: 500 }
         );
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Helper pour calculer les statistiques
function calculateStats(analyses) {
  const scores = analyses.map(a => a.results.healthScore);
  const categories = [...new Set(analyses.map(a => a.productSnapshot.category))];
  
  return {
    totalAnalyses: analyses.length,
    avgHealthScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    maxScore: Math.max(...scores),
    minScore: Math.min(...scores),
    categories
  };
}

// POST /api/export/pdf - Export PDF
router.post('/pdf', authenticateUser, checkPremium, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = req.user;
  const { startDate, endDate, category, minScore, maxScore } = req.body;
  
  logger.info('PDF export requested', { userId, filters: req.body });
  
  // Vérifier les quotas
  if (!user.checkQuota('exports')) {
    return res.status(403).json({
      success: false,
      error: 'Export quota exceeded',
      quotas: user.quotas,
      usage: user.usage
    });
  }
  
  // Récupérer les analyses
  const filters = {
    startDate,
    endDate,
    category,
    minScore,
    maxScore
  };
  
  const query = { userId };
  if (category) query['productSnapshot.category'] = category;
  if (minScore || maxScore) {
    query['results.healthScore'] = {};
    if (minScore) query['results.healthScore']['$gte'] = minScore;
    if (maxScore) query['results.healthScore']['$lte'] = maxScore;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt['$gte'] = new Date(startDate);
    if (endDate) query.createdAt['$lte'] = new Date(endDate);
  }
  
  const analyses = await Analysis.find(query)
    .sort({ createdAt: -1 })
    .limit(500); // Limite pour éviter les PDF trop gros
  
  if (analyses.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No analyses found for the specified criteria'
    });
  }
  
  // Générer le PDF
  const pdfBuffer = await generatePDF(user, analyses, filters);
  
  // Incrémenter l'usage
  await user.incrementUsage('exports');
  
  logger.info('PDF export generated', { userId, analysesCount: analyses.length });
  
  // Envoyer le PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=ecolojia-rapport-${Date.now()}.pdf`);
  res.send(pdfBuffer);
}));

// GET /api/export/csv - Export CSV
router.get('/csv', authenticateUser, checkPremium, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = req.user;
  const { startDate, endDate, category, minScore, maxScore } = req.query;
  
  logger.info('CSV export requested', { userId, filters: req.query });
  
  // Vérifier les quotas
  if (!user.checkQuota('exports')) {
    return res.status(403).json({
      success: false,
      error: 'Export quota exceeded',
      quotas: user.quotas,
      usage: user.usage
    });
  }
  
  // Récupérer les analyses
  const query = { userId };
  if (category) query['productSnapshot.category'] = category;
  if (minScore || maxScore) {
    query['results.healthScore'] = {};
    if (minScore) query['results.healthScore']['$gte'] = parseInt(minScore);
    if (maxScore) query['results.healthScore']['$lte'] = parseInt(maxScore);
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt['$gte'] = new Date(startDate);
    if (endDate) query.createdAt['$lte'] = new Date(endDate);
  }
  
  const analyses = await Analysis.find(query)
    .sort({ createdAt: -1 })
    .limit(1000);
  
  if (analyses.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No analyses found for the specified criteria'
    });
  }
  
  // Préparer les données pour CSV
  const csvData = analyses.map(analysis => ({
    Date: new Date(analysis.createdAt).toLocaleDateString('fr-FR'),
    Heure: new Date(analysis.createdAt).toLocaleTimeString('fr-FR'),
    Produit: analysis.productSnapshot.name,
    Marque: analysis.productSnapshot.brand || '',
    'Code-barres': analysis.productSnapshot.barcode || '',
    Catégorie: analysis.productSnapshot.category,
    'Score Santé': analysis.results.healthScore,
    'Score NOVA': analysis.results.foodAnalysis?.novaScore || '',
    'Nutri-Score': analysis.results.foodAnalysis?.nutriScore || '',
    'Nombre Additifs': analysis.results.foodAnalysis?.additiveCount || '',
    'Risque Endocrinien': analysis.results.cosmeticsAnalysis?.endocrineRisk || '',
    'Score Naturalité': analysis.results.cosmeticsAnalysis?.naturalityScore || '',
    'Impact Environnemental': analysis.results.detergentsAnalysis?.environmentalImpact || '',
    'Type Analyse': analysis.analysisType
  }));
  
  // Générer le CSV
  const parser = new Parser({
    fields: Object.keys(csvData[0]),
    delimiter: ';',
    withBOM: true // Pour Excel français
  });
  
  const csv = parser.parse(csvData);
  
  // Incrémenter l'usage
  await user.incrementUsage('exports');
  
  logger.info('CSV export generated', { userId, analysesCount: analyses.length });
  
  // Envoyer le CSV
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=ecolojia-export-${Date.now()}.csv`);
  res.send(csv);
}));

// POST /api/export/report - Rapport détaillé (PDF amélioré)
router.post('/report', authenticateUser, checkPremium, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = req.user;
  const { period = 30, includeRecommendations = true } = req.body;
  
  logger.info('Detailed report requested', { userId, period });
  
  // Vérifier les quotas
  if (!user.checkQuota('exports')) {
    return res.status(403).json({
      success: false,
      error: 'Export quota exceeded',
      quotas: user.quotas,
      usage: user.usage
    });
  }
  
  // Récupérer les statistiques
  const stats = await Analysis.getUserStats(userId, period);
  
  // Récupérer les analyses récentes
  const recentAnalyses = await Analysis.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20);
  
  // TODO: Générer un rapport PDF plus détaillé avec graphiques
  // Pour l'instant, on retourne les données JSON
  
  await user.incrementUsage('exports');
  
  res.json({
    success: true,
    report: {
      user: {
        name: user.name,
        email: user.email,
        tier: user.tier
      },
      period: `${period} derniers jours`,
      stats,
      recentAnalyses: recentAnalyses.map(a => ({
        date: a.createdAt,
        product: a.productSnapshot.name,
        score: a.results.healthScore,
        category: a.productSnapshot.category
      })),
      recommendations: includeRecommendations ? generateRecommendations(stats, recentAnalyses) : null,
      generatedAt: new Date()
    }
  });
}));

// Helper pour générer des recommandations
function generateRecommendations(stats, analyses) {
  const recommendations = [];
  
  if (stats.avgHealthScore < 50) {
    recommendations.push({
      type: 'warning',
      title: 'Score santé faible',
      message: 'Votre score santé moyen est inférieur à 50/100. Privilégiez des produits moins transformés.',
      priority: 'high'
    });
  }
  
  if (stats.categoriesAnalyzed === 1) {
    recommendations.push({
      type: 'info',
      title: 'Diversifiez vos analyses',
      message: 'Vous n\'avez analysé que des produits d\'une seule catégorie. Essayez d\'analyser aussi des cosmétiques ou détergents.',
      priority: 'medium'
    });
  }
  
  // Analyser les tendances
  const recentScores = analyses.slice(0, 10).map(a => a.results.healthScore);
  const olderScores = analyses.slice(10, 20).map(a => a.results.healthScore);
  
  if (recentScores.length > 0 && olderScores.length > 0) {
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    
    if (recentAvg > olderAvg + 5) {
      recommendations.push({
        type: 'success',
        title: 'Progression positive',
        message: 'Vos choix de produits s\'améliorent ! Continuez sur cette lancée.',
        priority: 'low'
      });
    }
  }
  
  return recommendations;
}

// GET /api/export/templates - Templates d'export disponibles
router.get('/templates', authenticateUser, checkPremium, (req, res) => {
  res.json({
    success: true,
    templates: [
      {
        id: 'basic-pdf',
        name: 'Rapport PDF basique',
        description: 'Liste simple de vos analyses avec statistiques',
        format: 'pdf',
        endpoint: '/api/export/pdf'
      },
      {
        id: 'csv-data',
        name: 'Export CSV données brutes',
        description: 'Toutes vos analyses en format tableur',
        format: 'csv',
        endpoint: '/api/export/csv'
      },
      {
        id: 'detailed-report',
        name: 'Rapport détaillé avec recommandations',
        description: 'Analyse approfondie avec conseils personnalisés',
        format: 'pdf',
        endpoint: '/api/export/report'
      }
    ]
  });
});

module.exports = router;
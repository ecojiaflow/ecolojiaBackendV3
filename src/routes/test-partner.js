// backend/src/routes/test-partner.js
// Route de test minimal pour vérifier que le routing fonctionne

const express = require('express');
const router = express.Router();

// Test simple
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Partner route is working!',
    timestamp: new Date().toISOString()
  });
});

// Info sur les partenaires
router.get('/info', (req, res) => {
  res.json({
    success: true,
    partners: ['lafourche', 'kazidomi', 'greenweez'],
    endpoints: {
      track: 'GET /api/partner/track/:productId?partner=xxx',
      stats: 'GET /api/partner/stats?partner=xxx',
      test: 'GET /api/partner/test'
    }
  });
});

module.exports = router;
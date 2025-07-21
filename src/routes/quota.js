// backend/src/routes/quota.js

const express = require('express');
const { quotaService, getQuotaStatus, incrementUsageAPI } = require('../services/QuotaService');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// GET /api/quota/status - Status quotas utilisateur
router.get('/status', authenticateUser, getQuotaStatus);

// POST /api/quota/increment - Incrémenter usage
router.post('/increment', authenticateUser, incrementUsageAPI);

// Routes protégées par quotas
router.post('/scan', 
  authenticateUser,
  quotaService.checkQuotaMiddleware('scan'),
  async (req, res) => {
    // Logique scan ici
    // Si succès, incrémenter usage
    await quotaService.incrementUsage(req.user.id, 'scan', req.user.tier);
    res.json({ success: true, data: 'Scan completed' });
  }
);

router.post('/ai-question',
  authenticateUser, 
  quotaService.checkQuotaMiddleware('aiQuestion'),
  async (req, res) => {
    // Logique IA ici
    await quotaService.incrementUsage(req.user.id, 'aiQuestion', req.user.tier);
    res.json({ success: true, data: 'AI question answered' });
  }
);

module.exports = router;

// Dans backend/src/app.js - Ajouter :
// app.use('/api/quota', require('./routes/quota'));
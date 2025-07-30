// backend/src/routes/partner.routes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AffiliateClick = require('../models/AffiliateClick');
const Product = require('../models/Product');
const User = require('../models/User');

/**
 * Configuration des partenaires affiliés
 */
const AFFILIATE_PARTNERS = {
  lafourche: {
    baseUrl: 'https://www.lafourche.fr',
    affiliateId: process.env.AFFILIATE_LAFOURCHE_ID || 'ecolojia-001',
    trackingParam: 'aff',
    categories: ['bio', 'vrac', 'zero-dechet']
  },
  kazidomi: {
    baseUrl: 'https://www.kazidomi.com',
    affiliateId: process.env.AFFILIATE_KAZIDOMI_ID || 'ECO2025',
    trackingParam: 'partner',
    categories: ['bio', 'vegan', 'sans-gluten']
  },
  greenweez: {
    baseUrl: 'https://www.greenweez.com',
    affiliateId: process.env.AFFILIATE_GREENWEEZ_ID || 'partner-ecolojia',
    trackingParam: 'utm_source',
    categories: ['eco-responsable', 'bio']
  }
};

/**
 * Génère l'URL d'affiliation avec tracking
 */
function generateAffiliateUrl(partner, originalUrl, clickId) {
  const config = AFFILIATE_PARTNERS[partner];
  if (!config) {
    throw new Error(`Unknown partner: ${partner}`);
  }

  const url = new URL(originalUrl);
  
  // Ajouter les paramètres d'affiliation
  url.searchParams.set(config.trackingParam, config.affiliateId);
  url.searchParams.set('utm_source', 'ecolojia');
  url.searchParams.set('utm_medium', 'affiliate');
  url.searchParams.set('utm_campaign', 'product_recommendation');
  url.searchParams.set('click_id', clickId);

  return url.toString();
}

/**
 * Route de tracking d'affiliation
 * GET /api/partner/track/:id
 */
router.get('/track/:id', async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { 
      partner, 
      source = 'product_page',
      campaign = 'organic' 
    } = req.query;

    // Validation
    if (!partner || typeof partner !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Partner parameter is required'
      });
    }

    if (!AFFILIATE_PARTNERS[partner]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid partner'
      });
    }

    // Validation de l'ID produit
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID format'
      });
    }

    // Récupérer le produit
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // CORRECTION : Créer/récupérer un utilisateur anonyme avec ID valide
    let userId;
    
    // Option 1 : Récupérer depuis l'auth (si disponible)
    if (req.user && req.user.id) {
      userId = req.user.id;
    } else {
      // Option 2 : Créer/récupérer un utilisateur anonyme
      console.log('[Affiliate] Creating/fetching anonymous user...');
      
      let anonymousUser = await User.findOne({ email: 'anonymous@ecolojia.app' });
      
      if (!anonymousUser) {
        console.log('[Affiliate] Anonymous user not found, creating...');
        anonymousUser = await User.create({
          email: 'anonymous@ecolojia.app',
          password: '$2b$12$dummy.hash.for.anonymous.user.never.login',
          name: 'Anonymous User',
          tier: 'free',
          isEmailVerified: true
        });
        console.log('[Affiliate] Anonymous user created with ID:', anonymousUser._id);
      }
      
      userId = anonymousUser._id;
      console.log('[Affiliate] Using user ID:', userId);
    }

    // Créer l'URL d'affiliation de base
    const partnerConfig = AFFILIATE_PARTNERS[partner];
    const originalUrl = `${partnerConfig.baseUrl}/search?q=${encodeURIComponent(product.name)}`;

    // Créer le click avec l'userId correct
    const click = await AffiliateClick.createClick({
      userId: userId,
      productId: productId,
      partner: partner,
      originalUrl: originalUrl,
      affiliateUrl: '', // Sera mis à jour juste après
      campaign: campaign,
      source: source,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referer: req.headers.referer,
      utmParams: {
        source: req.query.utm_source || 'ecolojia',
        medium: req.query.utm_medium || 'affiliate',
        campaign: req.query.utm_campaign || campaign,
        term: req.query.utm_term,
        content: req.query.utm_content
      }
    });

    // Générer l'URL finale avec le clickId
    const affiliateUrl = generateAffiliateUrl(partner, originalUrl, click.clickId);
    
    // Mettre à jour le click avec l'URL finale
    click.affiliateUrl = affiliateUrl;
    await click.save();

    // Log pour debug
    console.log(`[Affiliate] Click tracked: ${click.clickId} -> ${partner} for product ${product.name}`);

    // Redirection 302 vers le partenaire
    res.redirect(302, affiliateUrl);

  } catch (error) {
    console.error('[Affiliate] Error tracking click:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Récupère les statistiques d'affiliation
 * GET /api/partner/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { partner, period = 30 } = req.query;

    if (!partner || typeof partner !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Partner parameter is required'
      });
    }

    if (!AFFILIATE_PARTNERS[partner]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid partner'
      });
    }

    const stats = await AffiliateClick.getPartnerStats(partner, Number(period));

    res.json({
      success: true,
      data: {
        partner,
        period: Number(period),
        stats
      }
    });

  } catch (error) {
    console.error('[Affiliate] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Webhook pour conversions (appelé par les partenaires)
 * POST /api/partner/conversion
 */
router.post('/conversion', async (req, res) => {
  try {
    const { clickId, orderValue, orderId } = req.body;
    const partnerSecret = req.headers['x-partner-secret'];

    // Vérifier le secret du partenaire
    // TODO: Implémenter la vérification du secret

    if (!clickId || !orderValue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const click = await AffiliateClick.recordConversion(clickId, {
      value: Number(orderValue),
      orderId
    });

    console.log(`[Affiliate] Conversion recorded: ${clickId} -> ${orderValue}€`);

    res.json({
      success: true,
      data: {
        clickId,
        commission: click.commission
      }
    });

  } catch (error) {
    console.error('[Affiliate] Error recording conversion:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Test route pour vérifier que l'affiliation fonctionne
 * GET /api/partner/test
 */
router.get('/test', async (req, res) => {
  try {
    const partnersInfo = Object.entries(AFFILIATE_PARTNERS).map(([id, config]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      baseUrl: config.baseUrl,
      categories: config.categories
    }));

    res.json({
      success: true,
      message: 'Partner routes are working!',
      partners: partnersInfo,
      endpoints: [
        'GET /api/partner/track/:productId?partner=lafourche',
        'GET /api/partner/stats?partner=lafourche',
        'POST /api/partner/conversion'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Route pour récupérer les informations partenaires
 * GET /api/partner/info
 */
router.get('/info', (req, res) => {
  try {
    const partnersInfo = Object.entries(AFFILIATE_PARTNERS).map(([id, config]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      baseUrl: config.baseUrl,
      categories: config.categories,
      affiliateId: config.affiliateId
    }));

    res.json({
      success: true,
      partners: partnersInfo,
      totalPartners: partnersInfo.length
    });
  } catch (error) {
    console.error('[Affiliate] Error getting partner info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
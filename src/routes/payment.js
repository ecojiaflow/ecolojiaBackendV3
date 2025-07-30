// ═══════════════════════════════════════════════════════════════════════
// 3. backend/src/routes/payment.js
// ═══════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');

// Middleware d'authentification simple
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Non authentifié' });
    }
    // TODO: Décoder le token JWT pour obtenir userId
    req.userId = 'user-id-from-token';
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Token invalide' });
  }
};

// POST /api/payment/create-checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { plan = 'monthly' } = req.body;
    
    console.log('[Payment] Creating checkout for plan:', plan);

    // Configuration LemonSqueezy
    const variantId = plan === 'annual' ? '918462' : '918461'; // IDs de vos variants
    
    const response = await axios.post(
      'https://api.lemonsqueezy.com/v1/checkouts',
      {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                user_id: req.userId
              }
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: process.env.LEMONSQUEEZY_STORE_ID
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId
              }
            }
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    const checkoutUrl = response.data.data.attributes.url;

    res.json({
      success: true,
      checkoutUrl,
      plan
    });

  } catch (error) {
    console.error('[Payment] Checkout error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du paiement'
    });
  }
});

// POST /api/payment/webhook
router.post('/webhook', async (req, res) => {
  try {
    const { event_name, data } = req.body;
    
    console.log('[Payment] Webhook received:', event_name);

    switch (event_name) {
      case 'subscription_created':
      case 'subscription_updated':
        // Mettre à jour l'utilisateur en Premium
        const userId = data.attributes.custom_data?.user_id;
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            tier: 'premium',
            'subscription.status': 'active',
            'subscription.lemonSqueezySubscriptionId': data.id,
            'quotas.scansRemaining': 999999,
            'quotas.aiChatsRemaining': 500
          });
          console.log('[Payment] User upgraded to premium:', userId);
        }
        break;

      case 'subscription_cancelled':
      case 'subscription_expired':
        // Repasser en Free
        const cancelUserId = data.attributes.custom_data?.user_id;
        if (cancelUserId) {
          await User.findByIdAndUpdate(cancelUserId, {
            tier: 'free',
            'subscription.status': 'cancelled',
            'quotas.scansRemaining': 30,
            'quotas.aiChatsRemaining': 5
          });
          console.log('[Payment] User downgraded to free:', cancelUserId);
        }
        break;
    }

    res.json({ success: true });

  } catch (error) {
    console.error('[Payment] Webhook error:', error);
    res.status(500).json({ success: false });
  }
});

// GET /api/payment/customer-portal
router.get('/customer-portal', requireAuth, async (req, res) => {
  try {
    // TODO: Récupérer l'ID abonnement de l'utilisateur
    const user = await User.findById(req.userId);
    
    if (!user?.subscription?.lemonSqueezySubscriptionId) {
      return res.status(404).json({
        success: false,
        error: 'Aucun abonnement trouvé'
      });
    }

    // Générer URL portail client LemonSqueezy
    const portalUrl = `https://app.lemonsqueezy.com/my-orders/${user.subscription.lemonSqueezySubscriptionId}`;

    res.json({
      success: true,
      portalUrl
    });

  } catch (error) {
    console.error('[Payment] Portal error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur accès portail'
    });
  }
});

// GET /api/payment/health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'payment',
    lemonSqueezy: !!process.env.LEMONSQUEEZY_API_KEY,
    timestamp: new Date()
  });
});

module.exports = router;
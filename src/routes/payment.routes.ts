// PATH: src/routes/payment.routes.ts
import express from 'express';
import crypto from 'crypto';
import { LemonSqueezyService } from '../services/LemonSqueezyService';
import { getUserById, updateUserById } from '../services/user.service';

const router = express.Router();

// 🛡️ Middleware d'authentification basique
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, error: 'Non authentifié' });
  }
  next();
}

// ✅ Vérification manuelle de signature HMAC
function isValidLemonSignature(body: Buffer, signature: string, secret: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch (err) {
    return false;
  }
}

// ✅ POST /api/payment/create-checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    const url = await LemonSqueezyService.createCheckoutSession(user._id.toString(), user.email);
    res.json({ success: true, url });
  } catch (error) {
    console.error('❌ Erreur create-checkout:', error);
    res.status(500).json({ success: false, error: 'Erreur création paiement' });
  }
});

// ✅ POST /api/payment/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-signature'] as string;
  const secret = process.env.LEMON_WEBHOOK_SECRET;

  const rawBody = req.body as Buffer;

  if (!isValidLemonSignature(rawBody, signature, secret)) {
    console.warn('❌ Signature Lemon Squeezy invalide');
    return res.status(400).send('Invalid signature');
  }

  const payload = JSON.parse(rawBody.toString());
  const event = payload.meta?.event_name;
  const customUserId = payload.data.attributes?.custom_data?.userId;
  const subscriptionId = payload.data.id;

  try {
    if (!customUserId) {
      console.error('❌ userId manquant dans le webhook');
      return res.status(400).send('Missing user ID');
    }

    if (event === 'subscription_created' || event === 'subscription_updated') {
      await updateUserById(customUserId, {
        tier: 'premium',
        subscriptionId,
        customerId: payload.data.attributes.customer_id
      });
      console.log(`✅ Utilisateur ${customUserId} mis à jour en Premium`);
    }

    if (event === 'subscription_cancelled') {
      await updateUserById(customUserId, {
        tier: 'free',
        subscriptionId: null
      });
      console.log(`⚠️ Abonnement annulé pour ${customUserId}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erreur webhook Lemon Squeezy:', error);
    res.status(500).send('Webhook error');
  }
});

// ✅ GET /api/payment/portal
router.get('/portal', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    const portalUrl = await LemonSqueezyService.getCustomerPortal(user.customerId as string);
    res.json({ success: true, url: portalUrl });
  } catch (error) {
    console.error('❌ Erreur portail client:', error);
    res.status(500).json({ success: false, error: 'Erreur portail client' });
  }
});

export default router;
// EOF

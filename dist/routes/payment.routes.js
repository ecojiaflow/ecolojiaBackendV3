"use strict";
// PATH: backend/src/routes/payment.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const LemonSqueezyService_1 = require("../services/LemonSqueezyService");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * POST /api/payment/create-checkout
 * Crée une session de checkout Lemon Squeezy
 */
router.post('/create-checkout', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }
        if (user.tier === 'premium') {
            return res.status(400).json({
                success: false,
                error: 'Vous êtes déjà Premium'
            });
        }
        // Vérifier que le service est configuré
        if (!LemonSqueezyService_1.lemonSqueezyService.isConfigured()) {
            return res.status(503).json({
                success: false,
                error: 'Service de paiement temporairement indisponible'
            });
        }
        // Créer l'URL de checkout
        const checkoutUrl = await LemonSqueezyService_1.lemonSqueezyService.createCheckoutUrl({
            email: user.email,
            name: user.name,
            customData: {
                userId: user._id.toString()
            }
        });
        res.json({
            success: true,
            checkoutUrl
        });
    }
    catch (error) {
        console.error('Erreur création checkout:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de la session de paiement'
        });
    }
});
/**
 * POST /api/payment/webhook
 * Webhook Lemon Squeezy pour gérer les événements
 */
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-signature'];
        const rawBody = req.body.toString();
        // Vérifier la signature
        if (!LemonSqueezyService_1.lemonSqueezyService.verifyWebhookSignature(rawBody, signature)) {
            return res.status(401).json({ error: 'Signature invalide' });
        }
        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        console.log(`📨 Webhook Lemon Squeezy reçu: ${eventName}`);
        // Gérer les différents événements
        switch (eventName) {
            case 'subscription_created':
                await handleSubscriptionCreated(payload);
                break;
            case 'subscription_updated':
                await handleSubscriptionUpdated(payload);
                break;
            case 'subscription_cancelled':
                await handleSubscriptionCancelled(payload);
                break;
            case 'subscription_resumed':
                await handleSubscriptionResumed(payload);
                break;
            case 'subscription_expired':
                await handleSubscriptionExpired(payload);
                break;
            case 'subscription_payment_success':
                await handlePaymentSuccess(payload);
                break;
            case 'subscription_payment_failed':
                await handlePaymentFailed(payload);
                break;
            default:
                console.log(`Événement non géré: ${eventName}`);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Erreur webhook:', error);
        res.status(400).json({ error: 'Erreur traitement webhook' });
    }
});
/**
 * GET /api/payment/portal
 * Récupère l'URL du portail client
 */
router.get('/portal', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User_1.default.findById(userId);
        if (!user || !user.lemonSqueezyCustomerId) {
            return res.status(404).json({
                success: false,
                error: 'Client non trouvé'
            });
        }
        // Vérifier que le service est configuré
        if (!LemonSqueezyService_1.lemonSqueezyService.isConfigured()) {
            return res.status(503).json({
                success: false,
                error: 'Service de paiement temporairement indisponible'
            });
        }
        const portalUrl = await LemonSqueezyService_1.lemonSqueezyService.getCustomerPortalUrl(user.lemonSqueezyCustomerId);
        res.json({
            success: true,
            portalUrl
        });
    }
    catch (error) {
        console.error('Erreur création portail:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du portail'
        });
    }
});
/**
 * Handlers pour les événements webhook
 */
async function handleSubscriptionCreated(payload) {
    try {
        const userId = payload.meta.custom_data?.user_id;
        if (!userId)
            return;
        const user = await User_1.default.findById(userId);
        if (!user)
            return;
        const subscription = payload.data.attributes;
        // Mettre à jour l'utilisateur
        user.tier = 'premium';
        user.lemonSqueezyCustomerId = subscription.customer_id.toString();
        user.lemonSqueezySubscriptionId = payload.data.id;
        user.subscriptionStatus = 'active';
        user.subscriptionStartDate = new Date(subscription.created_at);
        user.subscriptionCurrentPeriodEnd = subscription.renews_at
            ? new Date(subscription.renews_at)
            : undefined;
        // Quotas Premium illimités
        user.quotas = {
            analyses: -1,
            aiQuestions: -1,
            exports: 10,
            apiCalls: 1000
        };
        await user.save();
        console.log(`✅ Utilisateur ${userId} passé en Premium via Lemon Squeezy`);
    }
    catch (error) {
        console.error('Erreur handleSubscriptionCreated:', error);
    }
}
async function handleSubscriptionUpdated(payload) {
    try {
        const subscriptionId = payload.data.id;
        const user = await User_1.default.findOne({ lemonSqueezySubscriptionId: subscriptionId });
        if (!user)
            return;
        const subscription = payload.data.attributes;
        user.subscriptionStatus = subscription.status;
        if (subscription.renews_at) {
            user.subscriptionCurrentPeriodEnd = new Date(subscription.renews_at);
        }
        await user.save();
        console.log(`✅ Abonnement mis à jour pour l'utilisateur ${user._id}`);
    }
    catch (error) {
        console.error('Erreur handleSubscriptionUpdated:', error);
    }
}
async function handleSubscriptionCancelled(payload) {
    try {
        const subscriptionId = payload.data.id;
        const user = await User_1.default.findOne({ lemonSqueezySubscriptionId: subscriptionId });
        if (!user)
            return;
        user.subscriptionStatus = 'cancelled';
        user.subscriptionCancelledAt = new Date();
        // L'utilisateur reste Premium jusqu'à la fin de la période
        console.log(`⚠️ Abonnement annulé pour l'utilisateur ${user._id} - Premium jusqu'au ${user.subscriptionCurrentPeriodEnd}`);
        await user.save();
    }
    catch (error) {
        console.error('Erreur handleSubscriptionCancelled:', error);
    }
}
async function handleSubscriptionExpired(payload) {
    try {
        const subscriptionId = payload.data.id;
        const user = await User_1.default.findOne({ lemonSqueezySubscriptionId: subscriptionId });
        if (!user)
            return;
        // Retour au tier gratuit
        user.tier = 'free';
        user.subscriptionStatus = 'expired';
        // Réinitialiser quotas gratuits
        user.quotas = {
            analyses: 30,
            aiQuestions: 0,
            exports: 0,
            apiCalls: 0
        };
        await user.save();
        console.log(`❌ Abonnement expiré pour l'utilisateur ${user._id} - Retour au plan gratuit`);
    }
    catch (error) {
        console.error('Erreur handleSubscriptionExpired:', error);
    }
}
async function handleSubscriptionResumed(payload) {
    try {
        const subscriptionId = payload.data.id;
        const user = await User_1.default.findOne({ lemonSqueezySubscriptionId: subscriptionId });
        if (!user)
            return;
        user.tier = 'premium';
        user.subscriptionStatus = 'active';
        user.subscriptionCancelledAt = undefined;
        // Restaurer quotas Premium
        user.quotas = {
            analyses: -1,
            aiQuestions: -1,
            exports: 10,
            apiCalls: 1000
        };
        await user.save();
        console.log(`✅ Abonnement réactivé pour l'utilisateur ${user._id}`);
    }
    catch (error) {
        console.error('Erreur handleSubscriptionResumed:', error);
    }
}
async function handlePaymentSuccess(payload) {
    console.log(`✅ Paiement réussi pour l'abonnement ${payload.data.id}`);
}
async function handlePaymentFailed(payload) {
    console.log(`❌ Échec du paiement pour l'abonnement ${payload.data.id}`);
    // TODO: Envoyer un email d'alerte
}
exports.default = router;

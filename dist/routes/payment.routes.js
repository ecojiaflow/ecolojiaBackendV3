"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/payment.routes.ts
const express_1 = require("express");
const cacheAuthMiddleware_1 = require("../middleware/cacheAuthMiddleware");
/**
 * Routes Paiement ECOLOJIA (stub simplifié)
 * Remplacez la logique par vos services Lemon Squeezy/Stripe réels.
 */
const router = (0, express_1.Router)();
// Créer une session Checkout
router.post('/create-checkout', cacheAuthMiddleware_1.cacheAuthMiddleware, async (_req, res) => {
    return res.json({ checkoutUrl: 'https://pay.ecolojia.dev/mock-checkout' });
});
// Portail client
router.get('/customer-portal', cacheAuthMiddleware_1.cacheAuthMiddleware, async (_req, res) => {
    return res.json({ portalUrl: 'https://pay.ecolojia.dev/mock-portal' });
});
// Vérifier session paiement
router.post('/verify-session', cacheAuthMiddleware_1.cacheAuthMiddleware, async (_req, res) => {
    return res.json({ success: true });
});
// Annuler abonnement
router.post('/cancel-subscription', cacheAuthMiddleware_1.cacheAuthMiddleware, async (_req, res) => {
    return res.json({ success: true });
});
// Reprendre abonnement
router.post('/resume-subscription', cacheAuthMiddleware_1.cacheAuthMiddleware, async (_req, res) => {
    return res.json({ success: true });
});
exports.default = router;
// EOF

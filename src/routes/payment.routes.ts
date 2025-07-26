// PATH: backend/src/routes/payment.routes.ts
import { Router, Request, Response } from 'express';
import { cacheAuthMiddleware as authMiddleware } from '../middleware/cacheAuthMiddleware';

/**
 * Routes Paiement ECOLOJIA (stub simplifié)
 * Remplacez la logique par vos services Lemon Squeezy/Stripe réels.
 */
const router = Router();

// Créer une session Checkout
router.post('/create-checkout', authMiddleware, async (_req: Request, res: Response) => {
  return res.json({ checkoutUrl: 'https://pay.ecolojia.dev/mock-checkout' });
});

// Portail client
router.get('/customer-portal', authMiddleware, async (_req: Request, res: Response) => {
  return res.json({ portalUrl: 'https://pay.ecolojia.dev/mock-portal' });
});

// Vérifier session paiement
router.post('/verify-session', authMiddleware, async (_req: Request, res: Response) => {
  return res.json({ success: true });
});

// Annuler abonnement
router.post('/cancel-subscription', authMiddleware, async (_req: Request, res: Response) => {
  return res.json({ success: true });
});

// Reprendre abonnement
router.post('/resume-subscription', authMiddleware, async (_req: Request, res: Response) => {
  return res.json({ success: true });
});

export default router;
// EOF

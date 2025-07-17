// PATH: backend/src/routes/cosmetic.routes.ts
import express from 'express';
import { analyzeCosmeticController } from '../controllers/cosmeticController';

const router = express.Router();

// Route pour analyser un produit cosmétique
router.post('/analyze', analyzeCosmeticController);

export default router;
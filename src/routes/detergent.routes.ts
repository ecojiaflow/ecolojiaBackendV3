// PATH: backend/src/routes/detergent.routes.ts
import express from 'express';
import { analyzeDetergentController } from '../controllers/detergentController';

const router = express.Router();

// Route pour analyser un produit détergent
router.post('/analyze', analyzeDetergentController);

export default router;
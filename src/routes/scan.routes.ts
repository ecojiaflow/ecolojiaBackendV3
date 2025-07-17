// PATH: backend/src/routes/scan.routes.ts
import express from 'express';
import { scanBarcodeController } from '../controllers/scanController';

const router = express.Router();

// Route pour scanner un code-barres
router.post('/barcode', scanBarcodeController);

export default router;
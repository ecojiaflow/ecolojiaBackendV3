// PATH: backend/src/controllers/scanController.ts
import { Request, Response } from 'express';
import { BarcodeAnalyzer } from '../services/ai/barcodeAnalyzer';
import { OpenFoodFactsService } from '../services/external/openFoodFactsService';
import { CategoryDetector } from '../services/ai/categoryDetector';

interface ScanBarcodeRequest {
  barcode: string;
  category?: 'alimentaire' | 'cosmetique' | 'detergent';
}

export const scanBarcodeController = async (req: Request, res: Response) => {
  try {
    const { barcode, category }: ScanBarcodeRequest = req.body;

    // Validation du code-barres
    if (!barcode || !/^\d{8,13}$/.test(barcode)) {
      return res.status(400).json({
        error: 'Code-barres invalide. Format EAN-8, EAN-13 ou UPC-A requis.',
        code: 'INVALID_BARCODE'
      });
    }

    console.log(`📱 Analyse code-barres: ${barcode}`);

    // Détection automatique de catégorie si non fournie
    const detectedCategory = category || CategoryDetector.detectFromBarcode(barcode);

    // Recherche du produit selon la catégorie
    let productData;
    switch (detectedCategory) {
      case 'alimentaire':
        productData = await OpenFoodFactsService.getProduct(barcode);
        break;
      case 'cosmetique':
        productData = await BarcodeAnalyzer.getCosmeticProduct(barcode);
        break;
      case 'detergent':
        productData = await BarcodeAnalyzer.getDetergentProduct(barcode);
        break;
      default:
        productData = await OpenFoodFactsService.getProduct(barcode);
    }

    // Si produit non trouvé, créer une analyse générique
    if (!productData) {
      productData = {
        barcode,
        name: `Produit ${barcode}`,
        category: detectedCategory,
        found: false,
        generic: true
      };
    }

    // Analyse selon la catégorie
    const analysis = await BarcodeAnalyzer.analyzeProduct(productData, detectedCategory);

    res.json({
      success: true,
      data: {
        barcode,
        category: detectedCategory,
        product: productData,
        analysis,
        timestamp: new Date().toISOString(),
        source: 'barcode_scan'
      }
    });

  } catch (error) {
    console.error('Erreur analyse code-barres:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'analyse du code-barres',
      code: 'SCAN_ERROR'
    });
  }
};
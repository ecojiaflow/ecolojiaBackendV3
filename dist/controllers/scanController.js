"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanBarcodeController = void 0;
const barcodeAnalyzer_1 = require("../services/ai/barcodeAnalyzer");
const openFoodFactsService_1 = require("../services/external/openFoodFactsService");
const categoryDetector_1 = require("../services/ai/categoryDetector");
const scanBarcodeController = async (req, res) => {
    try {
        const { barcode, category } = req.body;
        // Validation du code-barres
        if (!barcode || !/^\d{8,13}$/.test(barcode)) {
            return res.status(400).json({
                error: 'Code-barres invalide. Format EAN-8, EAN-13 ou UPC-A requis.',
                code: 'INVALID_BARCODE'
            });
        }
        console.log(`📱 Analyse code-barres: ${barcode}`);
        // Détection automatique de catégorie si non fournie
        const detectedCategory = category || categoryDetector_1.CategoryDetector.detectFromBarcode(barcode);
        // Recherche du produit selon la catégorie
        let productData;
        switch (detectedCategory) {
            case 'alimentaire':
                productData = await openFoodFactsService_1.OpenFoodFactsService.getProduct(barcode);
                break;
            case 'cosmetique':
                productData = await barcodeAnalyzer_1.BarcodeAnalyzer.getCosmeticProduct(barcode);
                break;
            case 'detergent':
                productData = await barcodeAnalyzer_1.BarcodeAnalyzer.getDetergentProduct(barcode);
                break;
            default:
                productData = await openFoodFactsService_1.OpenFoodFactsService.getProduct(barcode);
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
        const analysis = await barcodeAnalyzer_1.BarcodeAnalyzer.analyzeProduct(productData, detectedCategory);
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
    }
    catch (error) {
        console.error('Erreur analyse code-barres:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'analyse du code-barres',
            code: 'SCAN_ERROR'
        });
    }
};
exports.scanBarcodeController = scanBarcodeController;

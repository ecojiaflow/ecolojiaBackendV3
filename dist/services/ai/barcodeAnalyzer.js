"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeAnalyzer = void 0;
class BarcodeAnalyzer {
    static async analyzeProduct(productData, category) {
        const startTime = Date.now();
        // Pour l'instant, analyse générique pour tous les produits
        return this.getGenericAnalysis(productData, category, startTime);
    }
    static getGenericAnalysis(productData, category, startTime) {
        const prefix = productData.barcode.substring(0, 2);
        let score = 50;
        let riskFactors = ['Produit non trouvé en base de données'];
        let recommendations = ['Vérifiez les informations sur l\'emballage'];
        // Estimation basée sur la catégorie
        switch (category) {
            case 'alimentaire':
                const novaGroup = this.estimateNovaFromPrefix(prefix);
                score = (5 - novaGroup) * 20;
                riskFactors = [`Groupe NOVA estimé: ${novaGroup}`];
                recommendations = ['Privilégiez les produits peu transformés'];
                break;
            case 'cosmetique':
                score = 60;
                riskFactors = ['Composition INCI non analysée'];
                recommendations = ['Vérifiez la liste des ingrédients'];
                break;
            case 'detergent':
                score = 45;
                riskFactors = ['Impact environnemental non évalué'];
                recommendations = ['Choisissez des produits écolabellisés'];
                break;
        }
        return {
            novaGroup: category === 'alimentaire' ? this.estimateNovaFromPrefix(prefix) : undefined,
            riskFactors,
            recommendations,
            score,
            confidence: 0.5,
            processingTime: Date.now() - startTime,
            metadata: {
                method: 'generic_analysis',
                barcode: productData.barcode,
                category,
                timestamp: new Date().toISOString()
            }
        };
    }
    static estimateNovaFromPrefix(prefix) {
        const industrialPrefixes = ['30', '31', '70', '80'];
        const processedPrefixes = ['32', '33', '50', '60'];
        if (industrialPrefixes.includes(prefix))
            return 4;
        if (processedPrefixes.includes(prefix))
            return 3;
        return 2;
    }
    // Méthodes pour récupérer des produits (retournent null pour l'instant)
    static async getCosmeticProduct(barcode) {
        console.log(`🔍 Recherche cosmétique: ${barcode}`);
        return null;
    }
    static async getDetergentProduct(barcode) {
        console.log(`🔍 Recherche détergent: ${barcode}`);
        return null;
    }
}
exports.BarcodeAnalyzer = BarcodeAnalyzer;

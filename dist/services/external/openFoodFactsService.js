"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenFoodFactsService = void 0;
// PATH: backend/src/services/external/openFoodFactsService.ts
const axios_1 = __importDefault(require("axios"));
class OpenFoodFactsService {
    static async getProduct(barcode) {
        try {
            console.log(`🔍 Recherche OpenFoodFacts: ${barcode}`);
            const response = await axios_1.default.get(`${this.BASE_URL}/${barcode}.json`, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'ECOLOJIA/1.0 (contact@ecolojia.com)'
                }
            });
            if (response.data.status === 1 && response.data.product) {
                const product = response.data.product;
                return {
                    barcode,
                    name: product.product_name || `Produit ${barcode}`,
                    category: 'alimentaire',
                    composition: product.ingredients_text || undefined,
                    brand: product.brands || undefined,
                    image_url: product.image_url || undefined,
                    found: true
                };
            }
            console.log(`❌ Produit non trouvé dans OpenFoodFacts: ${barcode}`);
            return null;
        }
        catch (error) {
            console.error('Erreur OpenFoodFacts:', error);
            return null;
        }
    }
    static async searchProducts(query, limit = 20) {
        try {
            const response = await axios_1.default.get(`https://world.openfoodfacts.org/cgi/search.pl`, {
                params: {
                    search_terms: query,
                    json: 1,
                    page_size: limit,
                    sort_by: 'popularity'
                },
                timeout: 10000
            });
            if (response.data.products) {
                return response.data.products.map((product) => ({
                    barcode: product.code,
                    name: product.product_name || 'Produit sans nom',
                    category: 'alimentaire',
                    composition: product.ingredients_text,
                    brand: product.brands,
                    image_url: product.image_url,
                    found: true
                }));
            }
            return [];
        }
        catch (error) {
            console.error('Erreur recherche OpenFoodFacts:', error);
            return [];
        }
    }
}
exports.OpenFoodFactsService = OpenFoodFactsService;
OpenFoodFactsService.BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';

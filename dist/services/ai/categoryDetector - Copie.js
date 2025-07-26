"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryDetector = void 0;
// PATH: backend/src/services/ai/categoryDetector.ts
class CategoryDetector {
    static detectFromBarcode(barcode) {
        const prefix = barcode.substring(0, 2);
        if (this.FOOD_PREFIXES.includes(prefix)) {
            return 'alimentaire';
        }
        else if (this.COSMETIC_PREFIXES.includes(prefix)) {
            return 'cosmetique';
        }
        else if (this.DETERGENT_PREFIXES.includes(prefix)) {
            return 'detergent';
        }
        // Par défaut : alimentaire
        return 'alimentaire';
    }
}
exports.CategoryDetector = CategoryDetector;
CategoryDetector.FOOD_PREFIXES = ['30', '31', '32', '33', '34', '35', '36', '37', '20', '21', '22', '23', '24', '25', '26', '27', '40', '41', '42', '43', '44'];
CategoryDetector.COSMETIC_PREFIXES = ['50', '51', '52', '53', '54', '55', '60', '61', '62', '63'];
CategoryDetector.DETERGENT_PREFIXES = ['70', '71', '72', '73', '74', '75', '80', '81', '82', '83'];

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectUltraTransformation = void 0;
// PATH: backend/src/routes/ultraProcessing.routes.ts
var express_1 = require("express");
var router = (0, express_1.Router)();
// 🔎 Liste simplifiée des procédés ultra-transformants connus
var suspiciousKeywords = [
    'extrusion',
    'hydrogénation',
    'maltodextrine',
    'arôme artificiel',
    'emulsifiant',
    'correcteur d’acidité',
    'colorant',
    'édulcorant',
    'gomme xanthane',
    'monoglyceride',
    'E',
    'conservateur'
];
// 🔬 Analyse IA ultra-transformation
var detectUltraTransformation = function (ingredients) {
    var found = [];
    for (var _i = 0, ingredients_1 = ingredients; _i < ingredients_1.length; _i++) {
        var ing = ingredients_1[_i];
        for (var _a = 0, suspiciousKeywords_1 = suspiciousKeywords; _a < suspiciousKeywords_1.length; _a++) {
            var keyword = suspiciousKeywords_1[_a];
            if (ing.toLowerCase().includes(keyword)) {
                if (!found.includes(keyword)) {
                    found.push(keyword); // ✅ Pas besoin de Set
                }
            }
        }
    }
    var level = 'léger';
    var score = 25;
    if (found.length >= 3) {
        level = 'sévère';
        score = 90;
    }
    else if (found.length === 2) {
        level = 'modéré';
        score = 65;
    }
    else if (found.length === 1) {
        level = 'léger';
        score = 40;
    }
    return {
        level: level,
        score: score,
        detected: found,
        justification: "Analyse des ingr\u00E9dients : ".concat(found.length, " proc\u00E9d\u00E9(s) suspect(s) d\u00E9tect\u00E9(s) (").concat(found.join(', '), ")")
    };
};
exports.detectUltraTransformation = detectUltraTransformation;
router.post('/analyze', function (req, res) {
    var _a = req.body.product || {}, title = _a.title, ingredients = _a.ingredients;
    if (!title || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ success: false, error: 'Produit incomplet ou mal formé' });
    }
    var result = (0, exports.detectUltraTransformation)(ingredients);
    return res.json({
        success: true,
        product: title,
        ultraProcessing: result,
        sources: [
            'Monteiro et al. NOVA 2019',
            'EFSA 2021',
            'INSERM 2024',
            'ANSES 2022'
        ]
    });
});
exports.default = router;
// EOF

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectUltraTransformation = void 0;
// PATH: backend/src/routes/ultraProcessing.routes.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
// 🔎 Liste simplifiée des procédés ultra-transformants connus
const suspiciousKeywords = [
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
const detectUltraTransformation = (ingredients) => {
    const found = [];
    for (const ing of ingredients) {
        for (const keyword of suspiciousKeywords) {
            if (ing.toLowerCase().includes(keyword)) {
                if (!found.includes(keyword)) {
                    found.push(keyword); // ✅ Pas besoin de Set
                }
            }
        }
    }
    let level = 'léger';
    let score = 25;
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
        level,
        score,
        detected: found,
        justification: `Analyse des ingrédients : ${found.length} procédé(s) suspect(s) détecté(s) (${found.join(', ')})`
    };
};
exports.detectUltraTransformation = detectUltraTransformation;
router.post('/analyze', (req, res) => {
    const { title, ingredients } = req.body.product || {};
    if (!title || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ success: false, error: 'Produit incomplet ou mal formé' });
    }
    const result = (0, exports.detectUltraTransformation)(ingredients);
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

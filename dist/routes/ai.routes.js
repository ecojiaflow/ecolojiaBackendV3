"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/ai.routes.ts
const express_1 = require("express");
const auth_1 = require("../auth/middleware/auth");
const AIAnalysisService_1 = require("../services/ai/AIAnalysisService");
const router = (0, express_1.Router)();
/* POST /api/ai/analyze */
router.post('/analyze', auth_1.authenticate, async (req, res) => {
    try {
        const { productName, category, ingredients, prompt } = req.body;
        const data = await AIAnalysisService_1.aiAnalysisService.analyze({
            productName,
            category,
            ingredients,
            userId: req.user.id,
            premium: req.user.tier === 'premium',
            prompt
        });
        res.json({ success: true, data });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
exports.default = router;
// EOF

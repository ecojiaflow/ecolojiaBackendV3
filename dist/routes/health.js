"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/health.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
exports.default = router;

"use strict";
// PATH: src/app.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
/* --------------------------- Middleware de sécurité -------------------------- */
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
/* ------------------------------ Import des routes ----------------------------- */
const multiCategory_routes_1 = __importDefault(require("./routes/multiCategory.routes"));
app.use('/api/multi-category', multiCategory_routes_1.default);
/* ------------------------------- Routes système ------------------------------- */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Ecolojia backend alive',
        timestamp: Date.now()
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Ecolojia backend alive',
        timestamp: Date.now()
    });
});
exports.default = app;
// EOF

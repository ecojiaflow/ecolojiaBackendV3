"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const scan_routes_1 = __importDefault(require("./routes/scan.routes"));
const cosmetic_routes_1 = __importDefault(require("./routes/cosmetic.routes"));
const detergent_routes_1 = __importDefault(require("./routes/detergent.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ✅ ROUTE RACINE MISE À JOUR
app.get('/', (req, res) => {
    res.json({
        name: 'ECOLOJIA - Assistant IA Révolutionnaire',
        version: '2.0.0',
        status: 'operational',
        description: 'Premier assistant IA scientifique multi-catégories pour consommation responsable',
        features: [
            '🔬 Classification NOVA automatique',
            '📱 Scanner codes-barres universels',
            '💄 Analyse cosmétiques INCI',
            '🧽 Impact environnemental détergents',
            '🔍 Recherche OpenFoodFacts',
            '🎯 Détection automatique catégories',
            '📊 Sources scientifiques INSERM/EFSA 2024'
        ],
        endpoints: {
            health: '/api/health',
            scanner: 'POST /api/scan/barcode',
            cosmetic: 'POST /api/cosmetic/analyze',
            detergent: 'POST /api/detergent/analyze',
            products: {
                analyze: 'POST /api/products/analyze',
                status: 'GET /api/products/status'
            }
        },
        documentation: 'https://docs.ecolojia.com',
        contact: 'contact@ecolojia.com',
        timestamp: new Date().toISOString()
    });
});
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Ecolojia backend API running with scanner + multi-category analysis.',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            scanner: 'active',
            cosmetic_analyzer: 'active',
            detergent_analyzer: 'active',
            openfoodfacts: 'active'
        }
    });
});
// Routes existantes
app.use('/api/products', product_routes_1.default);
// Nouvelles routes
app.use('/api/scan', scan_routes_1.default);
app.use('/api/cosmetic', cosmetic_routes_1.default);
app.use('/api/detergent', detergent_routes_1.default);
// ✅ ROUTE 404 MISE À JOUR
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        message: `L'endpoint ${req.originalUrl} n'existe pas`,
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'POST /api/scan/barcode',
            'POST /api/cosmetic/analyze',
            'POST /api/detergent/analyze',
            'POST /api/products/analyze',
            'GET /api/products/status'
        ],
        timestamp: new Date().toISOString()
    });
});
exports.default = app;
// EOF

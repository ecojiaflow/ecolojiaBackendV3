"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const partner_routes_1 = __importDefault(require("./routes/partner.routes"));
const eco_score_routes_1 = __importDefault(require("./routes/eco-score.routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./docs/swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
// ✅ CORS CONFIGURATION - Utiliser CORS_ORIGIN avec trim pour nettoyer les espaces
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    'https://ecolojiafrontv3.netlify.app',
    'https://main--ecolojiafrontv3.netlify.app'
];
// Debug: Log de la variable d'environnement
console.log('🔍 CORS_ORIGIN env:', process.env.CORS_ORIGIN);
console.log('🔍 Allowed origins après parsing:', allowedOrigins);
const corsOptions = {
    origin: (origin, callback) => {
        // Autoriser les requêtes sans origin (Postman, mobile apps)
        if (!origin) {
            console.log('✅ Requête sans origin autorisée');
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            console.log('✅ Origin autorisée:', origin);
            callback(null, true);
        }
        else {
            console.log('❌ Origin refusée:', origin);
            console.log('❌ Origins autorisées:', allowedOrigins);
            callback(new Error('Non autorisé par CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-key', 'x-api-key']
};
// ✅ MIDDLEWARES
app.use((0, cors_1.default)(corsOptions));
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// ✅ ROUTES API
app.use('/api', product_routes_1.default);
app.use('/api', partner_routes_1.default);
app.use('/api/eco-score', eco_score_routes_1.default);
app.use('/', health_routes_1.default);
// ✅ SWAGGER DOCS
const swaggerUrl = process.env.NODE_ENV === 'production'
    ? `https://ecolojiabackendv3.onrender.com/api-docs`
    : `http://localhost:${process.env.PORT || 3000}/api-docs`;
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
console.log('📘 Swagger docs:', swaggerUrl);
// ✅ LOGS
console.log('✅ Routes de tracking partenaire activées');
console.log('✅ Routes de score écologique IA activées');
console.log('✅ CORS configuré pour:', allowedOrigins);
console.log('✅ Base de données:', process.env.DATABASE_URL ? 'connectée' : 'non configurée');
// ✅ ROOT INFO
app.get('/', (_req, res) => {
    res.json({
        message: 'Ecolojia API',
        version: '1.0.0',
        status: 'operational',
        environment: process.env.NODE_ENV || 'development',
        cors_origins: allowedOrigins,
        endpoints: [
            'GET /api/products',
            'GET /api/products/search',
            'GET /api/products/stats',
            'GET /api/products/:slug',
            'GET /api/products/:id/similar',
            'POST /api/products',
            'PUT /api/products/:id',
            'DELETE /api/products/:id',
            'GET /api/track/:id',
            'POST /api/eco-score/calculate',
            'POST /api/eco-score/update/:productId',
            'POST /api/eco-score/update-all',
            'GET /api/eco-score/stats',
            'GET /api/eco-score/test',
            'GET /health',
            'GET /api-docs'
        ],
        timestamp: new Date().toISOString()
    });
});
exports.default = app;

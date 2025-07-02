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
// ✅ CORS COMPLET POUR TOUS LES DOMAINES NETLIFY
const allowedOrigins = [
    'https://frontendv3.netlify.app', // FRONTEND PRINCIPAL
    'https://ecolojiafrontv3.netlify.app', // FRONTEND ALTERNATIF
    'https://main--ecolojiafrontv3.netlify.app', // BRANCH PREVIEW
    'https://ecolojiabackendv3.onrender.com', // BACKEND SELF
    'http://localhost:3000', // DEV REACT
    'http://localhost:5173', // DEV VITE
    'http://localhost:4173' // DEV VITE PREVIEW
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        console.log('🔍 Origin demandée:', origin);
        // Autoriser les requêtes sans origin (Postman, mobile apps)
        if (!origin) {
            console.log('✅ Requête sans origin autorisée');
            return callback(null, true);
        }
        // Vérifier si l'origin est autorisée
        if (allowedOrigins.includes(origin)) {
            console.log('✅ Origin autorisée:', origin);
            callback(null, true);
        }
        else {
            console.log('🚨 Origin bloquée:', origin);
            console.log('📋 Origins autorisées:', allowedOrigins);
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-cron-key',
        'x-api-key',
        'X-Requested-With',
        'Accept',
        'Origin'
    ]
}));
console.log('✅ CORS configuré pour:', allowedOrigins);
// ✅ MIDDLEWARES
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ✅ ROUTES API
app.use('/api', product_routes_1.default);
app.use('/api', partner_routes_1.default);
app.use('/api/eco-score', eco_score_routes_1.default);
app.use('/', health_routes_1.default);
app.use('/api', health_routes_1.default);
// ✅ SWAGGER DOCS
const swaggerUrl = process.env.NODE_ENV === 'production'
    ? `https://ecolojiabackendv3.onrender.com/api-docs`
    : `http://localhost:${process.env.PORT || 3000}/api-docs`;
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
console.log('📘 Swagger docs:', swaggerUrl);
// ✅ LOGS
console.log('✅ Routes de tracking partenaire activées');
console.log('✅ Routes de score écologique IA activées');
console.log('✅ Base de données:', process.env.DATABASE_URL ? 'connectée' : 'non configurée');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
// ✅ ROOT INFO ENDPOINT
app.get('/', (_req, res) => {
    res.json({
        message: 'Ecolojia API',
        version: '1.0.0',
        status: 'operational',
        environment: process.env.NODE_ENV || 'development',
        cors_status: 'NETLIFY_CONFIGURED',
        allowed_origins: allowedOrigins,
        timestamp: new Date().toISOString(),
        endpoints: {
            products: [
                'GET /api/products',
                'GET /api/products/search',
                'GET /api/products/stats',
                'GET /api/products/:slug',
                'GET /api/products/:id/similar',
                'POST /api/products',
                'PUT /api/products/:id',
                'DELETE /api/products/:id'
            ],
            tracking: [
                'GET /api/track/:id'
            ],
            ai: [
                'POST /api/eco-score/calculate',
                'POST /api/eco-score/update/:productId',
                'POST /api/eco-score/update-all',
                'GET /api/eco-score/stats',
                'GET /api/eco-score/test'
            ],
            health: [
                'GET /health',
                'GET /api/health'
            ],
            docs: [
                'GET /api-docs'
            ]
        }
    });
});
// ✅ GESTION ERREURS CORS
app.use((err, req, res, next) => {
    if (err.message && err.message.includes('not allowed by CORS')) {
        console.error('❌ Erreur CORS:', {
            origin: req.get('Origin'),
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent')
        });
        return res.status(403).json({
            error: 'CORS_ERROR',
            message: 'Origin not allowed',
            origin: req.get('Origin'),
            allowed_origins: allowedOrigins
        });
    }
    next(err);
});
exports.default = app;

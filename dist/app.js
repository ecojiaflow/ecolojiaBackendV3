"use strict";
// PATH: backend/src/app.ts
// -----------------------------------------------------------------------------
//  ECOLOJIA – Configuration dʼExpress (version complète corrigée)
//  Ce fichier expose désormais les routes IA (/api/ai) tout en conservant :
//  • Auth + validation email + rate‑limit
//  • Routes produits / scan / cosmetic / detergent / admin
//  • Sécurité CORS / Helmet
// -----------------------------------------------------------------------------
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// ───────────────────────────────  ROUTES  ────────────────────────────────────
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const scan_routes_1 = __importDefault(require("./routes/scan.routes"));
const cosmetic_routes_1 = __importDefault(require("./routes/cosmetic.routes"));
const detergent_routes_1 = __importDefault(require("./routes/detergent.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const auth_1 = __importDefault(require("./routes/auth"));
const emailValidation_1 = __importDefault(require("./routes/emailValidation"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes")); // ✅ NOUVELLE ROUTE IA
// ─────────────────────────────  INITIALISATION  ──────────────────────────────
dotenv_1.default.config();
const app = (0, express_1.default)();
// ───────────────────────────────  MIDDLEWARES  ───────────────────────────────
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Trop de tentatives depuis cette IP, réessayez dans 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://ecolojia-v3.netlify.app',
            'https://ecolojia-backend-working.onrender.com'
        ]
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:']
        }
    }
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// ────────────────────────────────  ROUTES  ───────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        name: 'ECOLOJIA – Assistant IA',
        version: '2.1.1',
        status: 'operational',
        description: 'Plateforme scientifique multi‑catégories pour une consommation responsable',
        endpoints: {
            health: '/api/health',
            auth: {
                health: 'GET /api/auth/health',
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/me',
                logout: 'POST /api/auth/logout'
            },
            emailValidation: {
                verify: 'POST /api/email-validation/verify',
                resend: 'POST /api/email-validation/resend',
                status: 'GET /api/email-validation/status/:email'
            },
            products: {
                analyze: 'POST /api/products/analyze',
                status: 'GET /api/products/status'
            },
            scan: 'POST /api/scan/barcode',
            cosmetic: 'POST /api/cosmetic/analyze',
            detergent: 'POST /api/detergent/analyze',
            ai: {
                analyze: 'POST /api/ai/analyze'
            },
            admin: {
                dashboard: 'GET /api/admin/dashboard'
            }
        }
    });
});
// HEALTH
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// AUTH & EMAIL
app.use('/api/auth', authLimiter, auth_1.default);
app.use('/api/email-validation', authLimiter, emailValidation_1.default);
// ANALYSES PRODUITS
app.use('/api/products', product_routes_1.default);
app.use('/api/scan', scan_routes_1.default);
app.use('/api/cosmetic', cosmetic_routes_1.default);
app.use('/api/detergent', detergent_routes_1.default);
app.use('/api/ai', ai_routes_1.default); // ✅ ROUTES IA EXPOSÉES
// ADMIN
app.use('/api/admin', admin_routes_1.default);
// 404 – catch‑all
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route non trouvée',
        message: `L'endpoint ${req.originalUrl} n'existe pas sur le serveur ECOLOJIA`,
        suggestion: 'Consultez GET / pour la liste complète des endpoints',
        timestamp: new Date().toISOString()
    });
});
// ERROR HANDLER
app.use((err, _req, res, _next) => {
    console.error('❌ Erreur serveur non gérée:', err);
    res.status(err.status || 500).json({
        success: false,
        error: 'Erreur serveur',
        message: process.env.NODE_ENV === 'production' ? 'Erreur interne' : err.message,
        timestamp: new Date().toISOString()
    });
});
exports.default = app;
// EOF

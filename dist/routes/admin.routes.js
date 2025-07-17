"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/admin.routes.ts
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Dashboard admin - statistiques imports
router.get('/dashboard', async (req, res) => {
    try {
        const stats = await Promise.all([
            prisma.product.count(),
            prisma.product.count({ where: { verified_status: 'verified' } }),
            prisma.product.count({ where: { image_url: { not: null } } }),
            prisma.product.groupBy({
                by: ['category'],
                _count: { category: true }
            })
        ]);
        const [totalProducts, verifiedProducts, productsWithImages, categoryStats] = stats;
        res.json({
            success: true,
            data: {
                totalProducts,
                verifiedProducts,
                productsWithImages,
                categoryBreakdown: categoryStats,
                lastUpdate: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Erreur dashboard admin:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des statistiques',
            code: 'ADMIN_DASHBOARD_ERROR'
        });
    }
});
// Logs d'import récents
router.get('/import-logs', async (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logsDir)) {
            return res.json({ success: true, data: { logs: [], message: 'Aucun log disponible' } });
        }
        const logFiles = fs.readdirSync(logsDir)
            .filter(file => file.startsWith('import-results-'))
            .sort((a, b) => b.localeCompare(a))
            .slice(0, 10);
        const logs = logFiles.map(file => {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(logsDir, file), 'utf8'));
                return {
                    filename: file,
                    timestamp: content.timestamp,
                    results: content.results,
                    config: content.config
                };
            }
            catch (error) {
                return null;
            }
        }).filter(log => log !== null);
        res.json({
            success: true,
            data: { logs }
        });
    }
    catch (error) {
        console.error('Erreur logs import:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des logs',
            code: 'IMPORT_LOGS_ERROR'
        });
    }
});
// Produits récents
router.get('/recent-products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const recentProducts = await prisma.product.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
            select: {
                id: true,
                title: true,
                slug: true,
                brand: true,
                category: true,
                eco_score: true,
                confidence_color: true,
                verified_status: true,
                image_url: true,
                created_at: true
            }
        });
        res.json({
            success: true,
            data: { products: recentProducts }
        });
    }
    catch (error) {
        console.error('Erreur produits récents:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des produits',
            code: 'RECENT_PRODUCTS_ERROR'
        });
    }
});
// Déclencher nouvel import
router.post('/trigger-import', async (req, res) => {
    try {
        const { maxProducts = 50 } = req.body;
        // Import en arrière-plan (ne pas bloquer la réponse)
        res.json({
            success: true,
            message: `Import de ${maxProducts} produits déclenché`,
            timestamp: new Date().toISOString()
        });
        // TODO: Déclencher import en arrière-plan
        console.log(`🚀 Import de ${maxProducts} produits déclenché via API`);
    }
    catch (error) {
        console.error('Erreur déclenchement import:', error);
        res.status(500).json({
            error: 'Erreur lors du déclenchement de l\'import',
            code: 'TRIGGER_IMPORT_ERROR'
        });
    }
});
exports.default = router;
// EOF

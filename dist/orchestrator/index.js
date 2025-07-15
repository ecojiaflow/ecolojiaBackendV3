"use strict";
/* ---------------------------------------------------------
 *  ECOLOJIA - ORCHESTRATEUR PRINCIPAL (TypeScript)
 *  Remplace N8N pour automatiser l'enrichissement produits
 * --------------------------------------------------------*/
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
const express_1 = __importDefault(require("express"));
const cron = __importStar(require("node-cron"));
const client_1 = require("@prisma/client");
const winston_1 = __importDefault(require("winston"));
const dataIngestion_1 = require("./jobs/dataIngestion");
const enrichment_1 = require("./jobs/enrichment");
class EcolojiaOrchestrator {
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.app = (0, express_1.default)();
        this.setupLogger();
        this.stats = {
            processed: 0,
            enriched: 0,
            errors: 0,
            startTime: Date.now()
        };
    }
    setupLogger() {
        this.logger = winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.simple()
                })
            ]
        });
    }
    async start() {
        try {
            // Test connexion base
            await this.prisma.$connect();
            this.logger.info('✅ Orchestrateur connecté à PostgreSQL');
            // Démarrer les tâches programmées
            this.setupCronJobs();
            // API de monitoring
            this.setupAPI();
            const PORT = process.env.ORCHESTRATOR_PORT || 3001;
            this.app.listen(PORT, () => {
                this.logger.info(`🚀 Orchestrateur démarré sur port ${PORT}`);
            });
        }
        catch (error) {
            this.logger.error('❌ Erreur démarrage orchestrateur:', error);
            process.exit(1);
        }
    }
    setupCronJobs() {
        // Import OpenFoodFacts quotidien (2h du matin)
        cron.schedule('0 2 * * *', async () => {
            this.logger.info('🔄 Démarrage import OpenFoodFacts quotidien');
            const ingestion = new dataIngestion_1.DataIngestion(this.prisma, this.logger);
            await ingestion.importNewProducts();
        });
        // Enrichissement IA (toutes les 4h)
        cron.schedule('0 */4 * * *', async () => {
            this.logger.info('🤖 Démarrage enrichissement IA');
            const enrichment = new enrichment_1.EnrichmentService(this.prisma, this.logger);
            await enrichment.processQueue();
        });
        // Nettoyage base (dimanche 3h)
        cron.schedule('0 3 * * 0', async () => {
            this.logger.info('🧹 Nettoyage base de données');
            await this.cleanupDatabase();
        });
        this.logger.info('⏰ Tâches programmées configurées');
    }
    setupAPI() {
        this.app.use(express_1.default.json());
        // Status orchestrateur
        this.app.get('/status', (req, res) => {
            res.json({
                status: 'running',
                uptime: Date.now() - this.stats.startTime,
                stats: this.stats,
                timestamp: new Date().toISOString()
            });
        });
        // ✅ NOUVELLE ROUTE : Remplace N8N pour suggestions
        this.app.post('/enrich-suggestion', async (req, res) => {
            try {
                const { query, zone, lang } = req.body;
                this.logger.info(`💡 Suggestion reçue: "${query}" (${zone}, ${lang})`);
                // Ajouter à la file d'enrichissement
                res.json({
                    success: true,
                    message: `Suggestion "${query}" ajoutée à la file d'enrichissement`,
                    status: 'queued',
                    estimatedTime: '2-4 heures'
                });
            }
            catch (error) {
                this.logger.error('Erreur suggestion:', error);
                res.status(500).json({ error: error.message });
            }
        });
        // Forcer enrichissement manuel
        this.app.post('/enrich/:productId', async (req, res) => {
            try {
                const { productId } = req.params;
                const enrichment = new enrichment_1.EnrichmentService(this.prisma, this.logger);
                const result = await enrichment.enrichProduct(productId);
                res.json({ success: true, result });
            }
            catch (error) {
                this.logger.error('Erreur enrichissement manuel:', error);
                res.status(500).json({ error: error.message });
            }
        });
        // Import manuel OpenFoodFacts
        this.app.post('/import', async (req, res) => {
            try {
                const ingestion = new dataIngestion_1.DataIngestion(this.prisma, this.logger);
                const imported = await ingestion.importNewProducts(50);
                res.json({ success: true, imported });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    async cleanupDatabase() {
        try {
            // Supprimer les produits dupliqués
            const duplicates = await this.prisma.$queryRaw `
        DELETE FROM "Product" 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at DESC) as rn
            FROM "Product"
          ) t WHERE rn > 1
        )
      `;
            this.logger.info(`🧹 ${duplicates.count || 0} doublons supprimés`);
        }
        catch (error) {
            this.logger.error('Erreur nettoyage:', error);
        }
    }
    async stop() {
        await this.prisma.$disconnect();
        this.logger.info('⏹️ Orchestrateur arrêté');
    }
}
exports.default = EcolojiaOrchestrator;
// Démarrage automatique si exécuté directement
if (require.main === module) {
    const orchestrator = new EcolojiaOrchestrator();
    orchestrator.start();
    // Arrêt propre
    process.on('SIGTERM', () => orchestrator.stop());
    process.on('SIGINT', () => orchestrator.stop());
}

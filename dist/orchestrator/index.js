"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataOrchestrator = void 0;
// PATH: backend/src/orchestrator/index.ts
const client_1 = require("@prisma/client");
const dataIngestion_1 = require("./jobs/dataIngestion");
const eco_score_service_1 = require("../services/eco-score.service");
const prisma = new client_1.PrismaClient();
class DataOrchestrator {
    constructor() {
        this.dataIngestion = new dataIngestion_1.DataIngestionJob();
        this.ecoScoreService = new eco_score_service_1.EcoScoreService();
    }
    async runDailyIngestion() {
        try {
            console.log('🌅 Début ingestion quotidienne');
            // Ingestion des données
            await this.dataIngestion.ingestProducts('openfoodfacts');
            // Mise à jour des scores eco
            await this.updateEcoScores();
            console.log('✅ Ingestion quotidienne terminée');
        }
        catch (error) {
            console.error('❌ Erreur ingestion quotidienne:', error);
            throw error;
        }
    }
    async runWeeklyMaintenance() {
        try {
            console.log('🗓️ Début maintenance hebdomadaire');
            // Nettoyage des données obsolètes
            await this.cleanupOldData();
            // Recalcul des scores
            await this.recalculateAllScores();
            console.log('✅ Maintenance hebdomadaire terminée');
        }
        catch (error) {
            console.error('❌ Erreur maintenance hebdomadaire:', error);
            throw error;
        }
    }
    async updateEcoScores() {
        try {
            console.log('🔄 Mise à jour scores eco');
            const categories = ['alimentaire', 'cosmétique', 'détergent'];
            for (const category of categories) {
                const updated = await this.ecoScoreService.updateScoresForCategory(category);
                console.log(`✅ ${updated} scores mis à jour pour ${category}`);
            }
        }
        catch (error) {
            console.error('❌ Erreur mise à jour scores:', error);
        }
    }
    async cleanupOldData() {
        try {
            console.log('🧹 Nettoyage données obsolètes');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            await prisma.product.deleteMany({
                where: {
                    updated_at: {
                        lt: thirtyDaysAgo
                    },
                    verified_status: 'verified' // ✅ CORRECTION: utiliser valeur enum valide
                }
            });
            console.log('✅ Nettoyage terminé');
        }
        catch (error) {
            console.error('❌ Erreur nettoyage:', error);
        }
    }
    async recalculateAllScores() {
        try {
            console.log('🔄 Recalcul tous les scores');
            const products = await prisma.product.findMany({
                select: {
                    id: true,
                    title: true,
                    description: true, // ✅ CORRECTION: utiliser description au lieu de ingredients
                    category: true
                }
            });
            let recalculated = 0;
            for (const product of products) {
                try {
                    const score = await this.ecoScoreService.calculate({
                        id: product.id,
                        title: product.title,
                        ingredients: product.description || '', // ✅ CORRECTION: utiliser description
                        category: product.category || ''
                    });
                    await this.ecoScoreService.saveScoreToDatabase(product.id, score);
                    recalculated++;
                }
                catch (error) {
                    console.error(`❌ Erreur recalcul ${product.id}:`, error);
                }
            }
            console.log(`✅ ${recalculated} scores recalculés`);
        }
        catch (error) {
            console.error('❌ Erreur recalcul global:', error);
        }
    }
    async getStatus() {
        try {
            const stats = await prisma.product.groupBy({
                by: ['verified_status'],
                _count: {
                    verified_status: true
                }
            });
            return {
                status: 'healthy',
                stats,
                lastUpdate: new Date()
            };
        }
        catch (error) {
            console.error('❌ Erreur status:', error);
            return {
                status: 'error',
                error: error.message,
                lastUpdate: new Date()
            };
        }
    }
    async cleanup() {
        await this.dataIngestion.cleanup();
        await this.ecoScoreService.cleanup();
        await prisma.$disconnect();
    }
}
exports.DataOrchestrator = DataOrchestrator;
exports.default = DataOrchestrator;
// EOF

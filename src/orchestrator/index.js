/* ---------------------------------------------------------
 *  ECOLOJIA - ORCHESTRATEUR PRINCIPAL
 *  Remplace N8N pour automatiser l'enrichissement produits
 * --------------------------------------------------------*/

const express = require('express');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const winston = require('winston');

const DataIngestion = require('./jobs/dataIngestion');
const EnrichmentService = require('./jobs/enrichment');

class EcolojiaOrchestrator {
  constructor() {
    this.prisma = new PrismaClient();
    this.app = express();
    this.setupLogger();
    this.stats = {
      processed: 0,
      enriched: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  setupLogger() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
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

    } catch (error) {
      this.logger.error('❌ Erreur démarrage orchestrateur:', error);
      process.exit(1);
    }
  }

  setupCronJobs() {
    // Import OpenFoodFacts quotidien (2h du matin)
    cron.schedule('0 2 * * *', async () => {
      this.logger.info('🔄 Démarrage import OpenFoodFacts quotidien');
      const ingestion = new DataIngestion(this.prisma, this.logger);
      await ingestion.importNewProducts();
    });

    // Enrichissement IA (toutes les 4h)
    cron.schedule('0 */4 * * *', async () => {
      this.logger.info('🤖 Démarrage enrichissement IA');
      const enrichment = new EnrichmentService(this.prisma, this.logger);
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
    this.app.use(express.json());

    // Status orchestrateur
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'running',
        uptime: Date.now() - this.stats.startTime,
        stats: this.stats,
        timestamp: new Date().toISOString()
      });
    });

    // Forcer enrichissement manuel
    this.app.post('/enrich/:productId', async (req, res) => {
      try {
        const { productId } = req.params;
        const enrichment = new EnrichmentService(this.prisma, this.logger);
        
        const result = await enrichment.enrichProduct(productId);
        res.json({ success: true, result });
      } catch (error) {
        this.logger.error('Erreur enrichissement manuel:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Import manuel OpenFoodFacts
    this.app.post('/import', async (req, res) => {
      try {
        const ingestion = new DataIngestion(this.prisma, this.logger);
        const imported = await ingestion.importNewProducts(50); // Limité à 50
        res.json({ success: true, imported });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async cleanupDatabase() {
    try {
      // Supprimer les produits dupliqués
      const duplicates = await this.prisma.$queryRaw`
        DELETE FROM "Product" 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at DESC) as rn
            FROM "Product"
          ) t WHERE rn > 1
        )
      `;

      this.logger.info(`🧹 ${duplicates.count || 0} doublons supprimés`);
    } catch (error) {
      this.logger.error('Erreur nettoyage:', error);
    }
  }

  async stop() {
    await this.prisma.$disconnect();
    this.logger.info('⏹️ Orchestrateur arrêté');
  }
}

module.exports = EcolojiaOrchestrator;

// Démarrage automatique si exécuté directement
if (require.main === module) {
  const orchestrator = new EcolojiaOrchestrator();
  orchestrator.start();

  // Arrêt propre
  process.on('SIGTERM', () => orchestrator.stop());
  process.on('SIGINT', () => orchestrator.stop());
}
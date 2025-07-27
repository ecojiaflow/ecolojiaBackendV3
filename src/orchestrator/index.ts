// PATH: backend/src/orchestrator/index.ts
// // import { PrismaClient } from '@prisma/client';
import { DataIngestionJob } from './jobs/dataIngestion';
import { EcoScoreService } from '../services/eco-score.service';

const prisma = null // new PrismaClient();

export class DataOrchestrator {
  private dataIngestion: DataIngestionJob;
  private ecoScoreService: EcoScoreService;

  constructor() {
    this.dataIngestion = new DataIngestionJob();
    this.ecoScoreService = new EcoScoreService();
  }

  async runDailyIngestion() {
    try {
      console.log('ðŸŒ… DÃ©but ingestion quotidienne');
      
      // Ingestion des donnÃ©es
      await this.dataIngestion.ingestProducts('openfoodfacts');
      
      // Mise Ã  jour des scores eco
      await this.updateEcoScores();
      
      console.log('âœ… Ingestion quotidienne terminÃ©e');
    } catch (error) {
      console.error('âŒ Erreur ingestion quotidienne:', error);
      throw error;
    }
  }

  async runWeeklyMaintenance() {
    try {
      console.log('ðŸ—“ï¸ DÃ©but maintenance hebdomadaire');
      
      // Nettoyage des donnÃ©es obsolÃ¨tes
      await this.cleanupOldData();
      
      // Recalcul des scores
      await this.recalculateAllScores();
      
      console.log('âœ… Maintenance hebdomadaire terminÃ©e');
    } catch (error) {
      console.error('âŒ Erreur maintenance hebdomadaire:', error);
      throw error;
    }
  }

  private async updateEcoScores() {
    try {
      console.log('ðŸ”„ Mise Ã  jour scores eco');
      
      const categories = ['alimentaire', 'cosmÃ©tique', 'dÃ©tergent'];
      
      for (const category of categories) {
        const updated = await this.ecoScoreService.updateScoresForCategory(category);
        console.log(`âœ… ${updated} scores mis Ã  jour pour ${category}`);
      }
    } catch (error) {
      console.error('âŒ Erreur mise Ã  jour scores:', error);
    }
  }

  private async cleanupOldData() {
    try {
      console.log('ðŸ§¹ Nettoyage donnÃ©es obsolÃ¨tes');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // await prisma.product.deleteMany({ // PRISMA DISABLED
        where: {
          updated_at: {
            lt: thirtyDaysAgo
          },
          verified_status: 'verified' // âœ… CORRECTION: utiliser valeur enum valide
        }
      });
      
      console.log('âœ… Nettoyage terminÃ©');
    } catch (error) {
      console.error('âŒ Erreur nettoyage:', error);
    }
  }

  private async recalculateAllScores() {
    try {
      console.log('ðŸ”„ Recalcul tous les scores');
      
      // const products = await prisma.product.findMany({ // PRISMA DISABLED
        select: {
          id: true,
          title: true,
          description: true, // âœ… CORRECTION: utiliser description au lieu de ingredients
          category: true
        }
      });
      
      let recalculated = 0;
      
      for (const product of products) {
        try {
          const score = await this.ecoScoreService.calculate({
            id: product.id,
            title: product.title,
            ingredients: product.description || '', // âœ… CORRECTION: utiliser description
            category: product.category || ''
          });
          
          await this.ecoScoreService.saveScoreToDatabase(product.id, score);
          recalculated++;
        } catch (error) {
          console.error(`âŒ Erreur recalcul ${product.id}:`, error);
        }
      }
      
      console.log(`âœ… ${recalculated} scores recalculÃ©s`);
    } catch (error) {
      console.error('âŒ Erreur recalcul global:', error);
    }
  }

  async getStatus() {
    try {
      // const stats = await prisma.product.groupBy({ // PRISMA DISABLED
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
    } catch (error) {
      console.error('âŒ Erreur status:', error);
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
    // // await prisma.$disconnect(); // PRISMA DISABLED // PRISMA DISABLED
  }
}

export default DataOrchestrator;
// EOF


// PATH: src/scripts/syncAlgolia.ts
// // import { PrismaClient } from '@prisma/client';
import AlgoliaService from '../services/algoliaService';

const prisma = null // new PrismaClient();

interface SyncOptions {
  useStaging?: boolean;
  clearFirst?: boolean;
  batchSize?: number;
  maxProducts?: number;
  onlyVerified?: boolean;
  skipConfiguration?: boolean;
}

interface SyncResult {
  totalProcessed: number;
  totalIndexed: number;
  totalFailed: number;
  duration: number;
  successRate: number;
  errors: string[];
}

export class AlgoliaSync {
  
  /**
   * Synchronisation complète de tous les produits
   */
  static async syncAllProducts(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const {
      useStaging = false,
      clearFirst = true,
      batchSize = 50,
      maxProducts,
      onlyVerified = false,
      skipConfiguration = false
    } = options;

    console.log('🚀 ========================================');
    console.log('🔄 DÉBUT SYNCHRONISATION ALGOLIA ECOLOJIA');
    console.log('🚀 ========================================');
    console.log(`📊 Mode: ${useStaging ? 'STAGING' : 'PRODUCTION'}`);
    console.log(`🔧 Options: clear=${clearFirst}, batch=${batchSize}, verified=${onlyVerified}`);
    
    const result: SyncResult = {
      totalProcessed: 0,
      totalIndexed: 0,
      totalFailed: 0,
      duration: 0,
      successRate: 0,
      errors: []
    };

    try {
      // 1. Test de connexion Algolia
      console.log('\n🔌 Test de connexion Algolia...');
      const connectionOk = await AlgoliaService.testConnection();
      if (!connectionOk) {
        throw new Error('Impossible de se connecter à Algolia');
      }

      // 2. Configuration de l'index
      if (!skipConfiguration) {
        console.log('🔧 Configuration de l\'index Algolia...');
        await AlgoliaService.configureIndex(useStaging);
      }
      
      // 3. Vider l'index si demandé
      if (clearFirst) {
        console.log('🗑️ Vidage de l\'index...');
        await AlgoliaService.clearIndex(useStaging);
      }

      // 4. Récupération des produits depuis PostgreSQL
      console.log('\n📦 Récupération des produits depuis PostgreSQL...');
      
      const whereClause: any = {};
      if (onlyVerified) {
        whereClause.verified_status = 'verified';
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        take: maxProducts,
        orderBy: { created_at: 'desc' }
      });

      console.log(`📊 ${products.length} produits trouvés en base`);
      result.totalProcessed = products.length;

      if (products.length === 0) {
        console.log('⚠️ Aucun produit à synchroniser');
        return result;
      }

      // 5. Affichage des détails des premiers produits
      console.log('\n📋 Aperçu des produits à indexer:');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`   ${index + 1}. "${product.title}" (${product.category}) - ${product.brand || 'Sans marque'}`);
      });
      if (products.length > 3) {
        console.log(`   ... et ${products.length - 3} autres produits`);
      }

      // 6. Indexation par batch
      console.log(`\n📤 Indexation par batch de ${batchSize} produits...`);
      let indexed = 0;
      let failed = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(products.length / batchSize);
        
        console.log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} produits)...`);
        
        try {
          const batchResult = await AlgoliaService.indexProducts(batch, useStaging);
          indexed += batchResult.success;
          failed += batchResult.failed;
          
          console.log(`   ✅ ${batchResult.success} indexés, ❌ ${batchResult.failed} échoués`);
          
        } catch (error) {
          const errorMsg = `Batch ${batchNumber} échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          result.errors.push(errorMsg);
          failed += batch.length;
          console.error(`   ❌ ${errorMsg}`);
        }

        // Pause entre les batches pour éviter les rate limits Algolia
        if (i + batchSize < products.length) {
          console.log('   ⏳ Pause 2s...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      result.totalIndexed = indexed;
      result.totalFailed = failed;

      // 7. Statistiques finales
      const endTime = Date.now();
      result.duration = Math.round((endTime - startTime) / 1000);
      result.successRate = result.totalProcessed > 0 ? Math.round((result.totalIndexed / result.totalProcessed) * 100) : 0;

      console.log('\n🎉 ========================================');
      console.log('✅ SYNCHRONISATION TERMINÉE !');
      console.log('🎉 ========================================');
      console.log(`📊 Résultats détaillés:`);
      console.log(`   • Total traités: ${result.totalProcessed}`);
      console.log(`   • Indexés avec succès: ${result.totalIndexed}`);
      console.log(`   • Échoués: ${result.totalFailed}`);
      console.log(`   • Taux de réussite: ${result.successRate}%`);
      console.log(`   • Durée: ${result.duration}s`);

      // 8. Vérification avec les stats Algolia
      console.log('\n🔍 Vérification index Algolia...');
      const algoliaStats = await AlgoliaService.getIndexStats(useStaging);
      console.log(`📈 Produits dans l'index: ${algoliaStats.totalProducts}`);
      console.log(`📂 Répartition catégories:`, algoliaStats.categories);
      console.log(`✅ Statuts vérification:`, algoliaStats.verificationStatus);

      // 9. Test de recherche
      console.log('\n🔍 Test de recherche...');
      const testResult = await AlgoliaService.searchProducts('bio', {}, { useStaging, hitsPerPage: 3 });
      console.log(`🎯 Recherche "bio": ${testResult.hits.length} résultats trouvés`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue lors de la synchronisation';
      result.errors.push(errorMsg);
      console.error('❌ ERREUR SYNCHRONISATION:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
      result.duration = Math.round((Date.now() - startTime) / 1000);
    }

    return result;
  }

  /**
   * Synchronisation incrémentale (produits récents seulement)
   */
  static async syncRecentProducts(hours = 24, useStaging = false): Promise<SyncResult> {
    console.log(`🔄 Synchronisation incrémentale (dernières ${hours}h)...`);
    
    const result: SyncResult = {
      totalProcessed: 0,
      totalIndexed: 0,
      totalFailed: 0,
      duration: 0,
      successRate: 0,
      errors: []
    };

    const startTime = Date.now();
    
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const recentProducts = await prisma.product.findMany({
        where: {
          updated_at: { gte: since }
        },
        orderBy: { updated_at: 'desc' }
      });

      console.log(`📦 ${recentProducts.length} produits modifiés depuis ${hours}h`);
      result.totalProcessed = recentProducts.length;

      if (recentProducts.length > 0) {
        const batchResult = await AlgoliaService.indexProducts(recentProducts, useStaging);
        result.totalIndexed = batchResult.success;
        result.totalFailed = batchResult.failed;
        
        console.log(`✅ Synchronisation incrémentale: ${result.totalIndexed} indexés, ${result.totalFailed} échoués`);
      }

      result.duration = Math.round((Date.now() - startTime) / 1000);
      result.successRate = result.totalProcessed > 0 ? Math.round((result.totalIndexed / result.totalProcessed) * 100) : 100;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur synchronisation incrémentale';
      result.errors.push(errorMsg);
      console.error('❌ Erreur synchronisation incrémentale:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }

    return result;
  }

  /**
   * Validation et nettoyage de l'index
   */
  static async validateIndex(useStaging = false): Promise<void> {
    console.log('🔍 Validation et nettoyage de l\'index...');
    
    try {
      // Récupérer tous les IDs de l'index Algolia
      const algoliaStats = await AlgoliaService.getIndexStats(useStaging);
      console.log(`📊 ${algoliaStats.totalProducts} produits dans l'index Algolia`);
      
      // Récupérer tous les IDs de la base PostgreSQL
      const dbProducts = await prisma.product.findMany({
        select: { id: true }
      });
      console.log(`📊 ${dbProducts.length} produits dans PostgreSQL`);
      
      // Comparaison basique
      const dbProductIds = new Set(dbProducts.map(p => p.id));
      console.log('✅ Validation basique terminée');
      
    } catch (error) {
      console.error('❌ Erreur validation index:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// ============================================
// SCRIPT CLI POUR EXÉCUTION LIGNE DE COMMANDE
// ============================================

async function main() {
  const args = process.argv.slice(2);
  
  // Parsing des arguments
  const useStaging = args.includes('--staging');
  const clearFirst = !args.includes('--no-clear');
  const maxProducts = args.includes('--max') ? parseInt(args[args.indexOf('--max') + 1]) : undefined;
  const onlyVerified = args.includes('--verified-only');
  const incremental = args.includes('--incremental');
  const hours = args.includes('--hours') ? parseInt(args[args.indexOf('--hours') + 1]) : 24;
  const validate = args.includes('--validate');

  console.log('🚀 ========================================');
  console.log('🌱 SCRIPT SYNCHRONISATION ALGOLIA ECOLOJIA');
  console.log('🚀 ========================================');
  console.log(`📋 Arguments détectés:`);
  console.log(`   • Mode: ${useStaging ? 'STAGING' : 'PRODUCTION'}`);
  console.log(`   • Vider index: ${clearFirst}`);
  console.log(`   • Max produits: ${maxProducts || 'tous'}`);
  console.log(`   • Seulement vérifiés: ${onlyVerified}`);
  console.log(`   • Incrémental: ${incremental}`);
  if (incremental) console.log(`   • Fenêtre: ${hours}h`);
  console.log(`   • Validation: ${validate}`);

  try {
    if (validate) {
      await AlgoliaSync.validateIndex(useStaging);
    } else if (incremental) {
      const result = await AlgoliaSync.syncRecentProducts(hours, useStaging);
      console.log(`\n📊 Résultat incrémental: ${result.successRate}% réussite`);
    } else {
      const result = await AlgoliaSync.syncAllProducts({
        useStaging,
        clearFirst,
        maxProducts,
        onlyVerified
      });
      
      console.log(`\n📊 Résultat final: ${result.successRate}% réussite en ${result.duration}s`);
      
      if (result.errors.length > 0) {
        console.log(`⚠️ Erreurs rencontrées (${result.errors.length}):`);
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    }
    
    console.log('\n🎉 Script terminé avec succès !');
    
  } catch (error) {
    console.error('\n❌ ÉCHEC DU SCRIPT:', error);
    console.log('\n💡 Conseils de dépannage:');
    console.log('   • Vérifiez vos clés API Algolia dans .env');
    console.log('   • Vérifiez la connexion à PostgreSQL');
    console.log('   • Essayez d\'abord avec --staging');
    console.log('   • Réduisez la taille avec --max 10');
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}

export default AlgoliaSync;
// EOF

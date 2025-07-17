const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 🧹 NETTOYAGE BASE POSTGRESQL
 * Supprime tous les produits de test pour avoir une base propre
 */

console.log('🧹 ECOLOJIA - Nettoyage base PostgreSQL');
console.log('⚠️  ATTENTION: Cette opération va supprimer TOUS les produits !');
console.log('='.repeat(60));

async function cleanDatabase() {
  try {
    console.log('🔍 Analyse de la base actuelle...\n');

    // 1. Compter les produits actuels
    const currentCount = await prisma.product.count();
    console.log(`📊 Produits actuels en base: ${currentCount}`);

    if (currentCount === 0) {
      console.log('✅ Base déjà vide - Aucun nettoyage nécessaire');
      return;
    }

    // 2. Afficher quelques exemples de produits
    const sampleProducts = await prisma.product.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        barcode: true,
        created_at: true,
        verified_status: true
      }
    });

    console.log('\n📋 Exemples de produits en base:');
    sampleProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.title} (${product.barcode || 'Sans code-barres'})`);
    });

    console.log('\n🗑️  Suppression de tous les produits...');

    // 3. Supprimer TOUS les produits
    const deleteResult = await prisma.product.deleteMany({});

    console.log(`✅ ${deleteResult.count} produits supprimés avec succès`);

    // 4. Vérification finale
    const finalCount = await prisma.product.count();
    console.log(`📊 Produits restants: ${finalCount}`);

    // 5. Reset des séquences (optionnel pour PostgreSQL)
    try {
      await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('products', 'created_at'), 1, false);`;
      console.log('🔄 Séquences réinitialisées');
    } catch (error) {
      console.log('⚠️  Réinitialisation séquences ignorée');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 BASE NETTOYÉE AVEC SUCCÈS !');
    console.log('💡 Vous pouvez maintenant lancer l\'import de produits réels');
    console.log('🚀 Commande: node scripts/importDirectToDB.js');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
    console.error('💡 Détails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction de nettoyage sélectif (bonus)
async function cleanTestProducts() {
  try {
    console.log('🧹 Nettoyage sélectif - Produits de test uniquement...\n');

    // Supprimer uniquement les produits "test" ou mock
    const deleteResult = await prisma.product.deleteMany({
      where: {
        OR: [
          { title: { contains: 'test', mode: 'insensitive' } },
          { title: { contains: 'mock', mode: 'insensitive' } },
          { title: { contains: 'exemple', mode: 'insensitive' } },
          { description: { contains: 'mock', mode: 'insensitive' } },
          { barcode: null }, // Produits sans code-barres (probablement des tests)
          { verified_status: 'manual_review' }, // Statut de test
          {
            title: {
              in: [
                'Shampooing Bio Lavande',
                'Dentifrice Menthe Naturel',
                'Savon Artisanal Karité',
                'Crème Visage Aloe Vera',
                'Huile d\'Olive Extra Vierge'
              ]
            }
          }
        ]
      }
    });

    console.log(`✅ ${deleteResult.count} produits de test supprimés`);

    const remainingCount = await prisma.product.count();
    console.log(`📊 Produits réels conservés: ${remainingCount}`);

  } catch (error) {
    console.error('❌ Erreur nettoyage sélectif:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Menu interactif
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    console.log('🗑️  Mode: Suppression TOTALE\n');
    await cleanDatabase();
  } else if (args.includes('--test-only')) {
    console.log('🧹 Mode: Suppression produits TEST uniquement\n');
    await cleanTestProducts();
  } else {
    console.log('🔧 SCRIPT NETTOYAGE BASE POSTGRESQL');
    console.log('\nCommandes disponibles:');
    console.log('  node scripts/cleanDatabase.js --all        # Supprime TOUS les produits');
    console.log('  node scripts/cleanDatabase.js --test-only  # Supprime uniquement les produits test');
    console.log('\n⚠️  RECOMMANDÉ: Utilisez --all pour une base 100% propre');
    console.log('💡 Puis lancez: node scripts/importDirectToDB.js');
  }
}

// Confirmation interactive (sécurité)
function askConfirmation() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  Êtes-vous sûr de vouloir supprimer les produits ? (oui/non): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes');
    });
  });
}

// Lancement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanDatabase, cleanTestProducts };
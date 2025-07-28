// backend/scripts/migrate-pg-to-mongo.js
const { Pool } = require('pg');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ora = require('ora');
const chalk = require('chalk');

// Importer les modèles MongoDB
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Analysis = require('../src/models/Analysis');
const Favorite = require('../src/models/Favorite');

// Configuration
const BATCH_SIZE = 100;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Ecolojia:Mongodb122331@ecolojia.gnfz2k8.mongodb.net/ecolojia?retryWrites=true&w=majority';
const PG_CONNECTION = process.env.DATABASE_URL || 'postgresql://ecolojia_db_user:Mj2kdVH9LJKTQLvLQ2HIrdJjsqThJmBI@dpg-d11fl849c44c73f9jmf0-a.frankfurt-postgres.render.com:5432/ecolojia_db?schema=public';

// PostgreSQL pool
const pgPool = new Pool({
  connectionString: PG_CONNECTION,
  ssl: { rejectUnauthorized: false }
});

// Statistiques de migration
const stats = {
  users: { total: 0, migrated: 0, failed: 0 },
  products: { total: 0, migrated: 0, failed: 0 },
  analyses: { total: 0, migrated: 0, failed: 0 },
  favorites: { total: 0, migrated: 0, failed: 0 }
};

// Fonction helper pour créer des spinners
const createSpinner = (text) => ora({
  text,
  color: 'cyan',
  spinner: 'dots'
});

// Migration des utilisateurs
async function migrateUsers() {
  const spinner = createSpinner('Migration des utilisateurs...');
  spinner.start();

  try {
    // Récupérer les utilisateurs depuis PostgreSQL
    const { rows: pgUsers } = await pgPool.query(`
      SELECT 
        id, email, password, name, created_at, updated_at,
        is_email_verified, email_verification_token, email_verification_expires,
        reset_password_token, reset_password_expires,
        tier, stripe_customer_id, stripe_subscription_id,
        subscription_status, subscription_start_date, subscription_current_period_end
      FROM users
      ORDER BY id
    `);

    stats.users.total = pgUsers.length;
    spinner.text = `Migration de ${pgUsers.length} utilisateurs...`;

    // Migrer par batch
    for (let i = 0; i < pgUsers.length; i += BATCH_SIZE) {
      const batch = pgUsers.slice(i, i + BATCH_SIZE);
      const mongoUsers = [];

      for (const pgUser of batch) {
        try {
          // Mapper les données PostgreSQL vers MongoDB
          const mongoUser = {
            _id: new mongoose.Types.ObjectId(),
            pgId: pgUser.id, // Garder la référence pour les relations
            email: pgUser.email.toLowerCase(),
            password: pgUser.password,
            name: pgUser.name,
            tier: pgUser.tier || 'free',
            
            // Auth
            isEmailVerified: pgUser.is_email_verified || false,
            emailVerificationToken: pgUser.email_verification_token,
            emailVerificationExpires: pgUser.email_verification_expires,
            resetPasswordToken: pgUser.reset_password_token,
            resetPasswordExpires: pgUser.reset_password_expires,
            
            // LemonSqueezy (adapter de Stripe)
            lemonSqueezyCustomerId: pgUser.stripe_customer_id,
            lemonSqueezySubscriptionId: pgUser.stripe_subscription_id,
            subscriptionStatus: pgUser.subscription_status,
            subscriptionStartDate: pgUser.subscription_start_date,
            subscriptionCurrentPeriodEnd: pgUser.subscription_current_period_end,
            
            // Quotas selon le tier
            quotas: pgUser.tier === 'premium' ? {
              analyses: -1,
              aiQuestions: -1,
              exports: 10,
              apiCalls: 1000
            } : {
              analyses: 30,
              aiQuestions: 0,
              exports: 0,
              apiCalls: 0
            },
            
            // Usage (reset)
            usage: {
              analyses: 0,
              aiQuestions: 0,
              exports: 0,
              apiCalls: 0,
              lastResetDate: new Date()
            },
            
            createdAt: pgUser.created_at,
            updatedAt: pgUser.updated_at
          };

          mongoUsers.push(mongoUser);
        } catch (error) {
          console.error(chalk.red(`❌ Erreur mapping utilisateur ${pgUser.email}:`), error.message);
          stats.users.failed++;
        }
      }

      // Insérer le batch dans MongoDB
      if (mongoUsers.length > 0) {
        try {
          await User.insertMany(mongoUsers, { ordered: false });
          stats.users.migrated += mongoUsers.length;
          spinner.text = `Migration utilisateurs: ${stats.users.migrated}/${stats.users.total}`;
        } catch (error) {
          console.error(chalk.red('❌ Erreur insertion batch utilisateurs:'), error.message);
          stats.users.failed += mongoUsers.length;
        }
      }
    }

    spinner.succeed(chalk.green(`✅ Utilisateurs migrés: ${stats.users.migrated}/${stats.users.total}`));
  } catch (error) {
    spinner.fail(chalk.red('❌ Erreur migration utilisateurs'));
    console.error(error);
  }
}

// Migration des produits
async function migrateProducts() {
  const spinner = createSpinner('Migration des produits...');
  spinner.start();

  try {
    // Récupérer les produits depuis PostgreSQL
    const { rows: pgProducts } = await pgPool.query(`
      SELECT 
        p.*,
        pa.health_score,
        pa.nova_score,
        pa.nutri_score,
        pa.eco_score,
        pa.additives_count,
        pa.created_at as analyzed_at
      FROM products p
      LEFT JOIN product_analyses pa ON p.id = pa.product_id
      ORDER BY p.id
    `);

    stats.products.total = pgProducts.length;
    spinner.text = `Migration de ${pgProducts.length} produits...`;

    // Créer un mapping pgId -> mongoId pour les utilisateurs
    const userMapping = {};
    const mongoUsers = await User.find({}, { pgId: 1, _id: 1 });
    mongoUsers.forEach(u => {
      if (u.pgId) userMapping[u.pgId] = u._id;
    });

    // Migrer par batch
    for (let i = 0; i < pgProducts.length; i += BATCH_SIZE) {
      const batch = pgProducts.slice(i, i + BATCH_SIZE);
      const mongoProducts = [];

      for (const pgProduct of batch) {
        try {
          const category = pgProduct.category || 'food';
          
          const mongoProduct = {
            _id: new mongoose.Types.ObjectId(),
            pgId: pgProduct.id,
            barcode: pgProduct.barcode,
            name: pgProduct.name,
            brand: pgProduct.brand,
            category: category,
            imageUrl: pgProduct.image_url,
            
            // Données spécifiques selon la catégorie
            foodData: category === 'food' ? {
              ingredients: pgProduct.ingredients ? pgProduct.ingredients.split(',').map(i => i.trim()) : [],
              allergens: pgProduct.allergens || [],
              nutritionalInfo: pgProduct.nutritional_info || {},
              novaScore: pgProduct.nova_score,
              nutriScore: pgProduct.nutri_score,
              ecoScore: pgProduct.eco_score
            } : undefined,
            
            cosmeticsData: category === 'cosmetics' ? {
              inciList: pgProduct.inci_list || '',
              ingredients: [],
              endocrineDisruptors: [],
              allergens: [],
              certifications: []
            } : undefined,
            
            detergentsData: category === 'detergents' ? {
              composition: [],
              surfactants: [],
              phosphateFree: true,
              biodegradable: true,
              ecoLabels: []
            } : undefined,
            
            // Analyse
            analysisData: {
              healthScore: pgProduct.health_score || 0,
              lastAnalyzedAt: pgProduct.analyzed_at,
              version: '1.0',
              confidence: 0.8
            },
            
            viewCount: 0,
            scanCount: pgProduct.scan_count || 0,
            createdAt: pgProduct.created_at,
            updatedAt: pgProduct.updated_at
          };

          mongoProducts.push(mongoProduct);
        } catch (error) {
          console.error(chalk.red(`❌ Erreur mapping produit ${pgProduct.name}:`), error.message);
          stats.products.failed++;
        }
      }

      // Insérer le batch dans MongoDB
      if (mongoProducts.length > 0) {
        try {
          await Product.insertMany(mongoProducts, { ordered: false });
          stats.products.migrated += mongoProducts.length;
          spinner.text = `Migration produits: ${stats.products.migrated}/${stats.products.total}`;
        } catch (error) {
          console.error(chalk.red('❌ Erreur insertion batch produits:'), error.message);
          stats.products.failed += mongoProducts.length;
        }
      }
    }

    spinner.succeed(chalk.green(`✅ Produits migrés: ${stats.products.migrated}/${stats.products.total}`));
  } catch (error) {
    spinner.fail(chalk.red('❌ Erreur migration produits'));
    console.error(error);
  }
}

// Migration des analyses
async function migrateAnalyses() {
  const spinner = createSpinner('Migration des analyses...');
  spinner.start();

  try {
    // Récupérer les analyses depuis PostgreSQL
    const { rows: pgAnalyses } = await pgPool.query(`
      SELECT 
        s.*,
        p.name as product_name,
        p.brand as product_brand,
        p.barcode as product_barcode,
        p.image_url as product_image,
        p.category as product_category,
        pa.health_score,
        pa.nova_score,
        pa.nutri_score,
        pa.additives_count
      FROM scans s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN product_analyses pa ON s.product_id = pa.product_id
      WHERE s.user_id IS NOT NULL
      ORDER BY s.id
    `);

    stats.analyses.total = pgAnalyses.length;
    spinner.text = `Migration de ${pgAnalyses.length} analyses...`;

    // Créer les mappings
    const userMapping = {};
    const productMapping = {};
    
    const mongoUsers = await User.find({}, { pgId: 1, _id: 1 });
    mongoUsers.forEach(u => {
      if (u.pgId) userMapping[u.pgId] = u._id;
    });
    
    const mongoProducts = await Product.find({}, { pgId: 1, _id: 1 });
    mongoProducts.forEach(p => {
      if (p.pgId) productMapping[p.pgId] = p._id;
    });

    // Migrer par batch
    for (let i = 0; i < pgAnalyses.length; i += BATCH_SIZE) {
      const batch = pgAnalyses.slice(i, i + BATCH_SIZE);
      const mongoAnalyses = [];

      for (const pgAnalysis of batch) {
        try {
          const userId = userMapping[pgAnalysis.user_id];
          const productId = productMapping[pgAnalysis.product_id];
          
          if (!userId) {
            console.warn(chalk.yellow(`⚠️  User ID ${pgAnalysis.user_id} non trouvé`));
            stats.analyses.failed++;
            continue;
          }

          const mongoAnalysis = {
            _id: new mongoose.Types.ObjectId(),
            userId: userId,
            productId: productId,
            
            // Snapshot produit
            productSnapshot: {
              name: pgAnalysis.product_name,
              brand: pgAnalysis.product_brand,
              barcode: pgAnalysis.product_barcode,
              imageUrl: pgAnalysis.product_image,
              category: pgAnalysis.product_category || 'food'
            },
            
            analysisType: 'barcode_scan',
            
            // Résultats
            results: {
              healthScore: pgAnalysis.health_score || 50,
              
              foodAnalysis: pgAnalysis.product_category === 'food' ? {
                novaScore: pgAnalysis.nova_score,
                nutriScore: pgAnalysis.nutri_score,
                additiveCount: pgAnalysis.additives_count || 0
              } : undefined,
              
              alternatives: [],
              
              aiInsights: {
                summary: 'Analyse migrée depuis l\'ancienne base de données',
                recommendations: [],
                warnings: []
              }
            },
            
            metadata: {
              appVersion: '2.0',
              platform: 'web'
            },
            
            createdAt: pgAnalysis.scanned_at || pgAnalysis.created_at
          };

          mongoAnalyses.push(mongoAnalysis);
        } catch (error) {
          console.error(chalk.red(`❌ Erreur mapping analyse:`, error.message));
          stats.analyses.failed++;
        }
      }

      // Insérer le batch dans MongoDB
      if (mongoAnalyses.length > 0) {
        try {
          await Analysis.insertMany(mongoAnalyses, { ordered: false });
          stats.analyses.migrated += mongoAnalyses.length;
          spinner.text = `Migration analyses: ${stats.analyses.migrated}/${stats.analyses.total}`;
        } catch (error) {
          console.error(chalk.red('❌ Erreur insertion batch analyses:'), error.message);
          stats.analyses.failed += mongoAnalyses.length;
        }
      }
    }

    spinner.succeed(chalk.green(`✅ Analyses migrées: ${stats.analyses.migrated}/${stats.analyses.total}`));
  } catch (error) {
    spinner.fail(chalk.red('❌ Erreur migration analyses'));
    console.error(error);
  }
}

// Migration des favoris
async function migrateFavorites() {
  const spinner = createSpinner('Migration des favoris...');
  spinner.start();

  try {
    // Récupérer les favoris depuis PostgreSQL
    const { rows: pgFavorites } = await pgPool.query(`
      SELECT 
        uf.*,
        p.name as product_name,
        p.brand as product_brand,
        p.barcode as product_barcode,
        p.image_url as product_image,
        p.category as product_category,
        pa.health_score
      FROM user_favorites uf
      LEFT JOIN products p ON uf.product_id = p.id
      LEFT JOIN product_analyses pa ON uf.product_id = pa.product_id
      ORDER BY uf.user_id, uf.product_id
    `);

    stats.favorites.total = pgFavorites.length;
    spinner.text = `Migration de ${pgFavorites.length} favoris...`;

    // Créer les mappings
    const userMapping = {};
    const productMapping = {};
    
    const mongoUsers = await User.find({}, { pgId: 1, _id: 1 });
    mongoUsers.forEach(u => {
      if (u.pgId) userMapping[u.pgId] = u._id;
    });
    
    const mongoProducts = await Product.find({}, { pgId: 1, _id: 1 });
    mongoProducts.forEach(p => {
      if (p.pgId) productMapping[p.pgId] = p._id;
    });

    // Migrer par batch
    for (let i = 0; i < pgFavorites.length; i += BATCH_SIZE) {
      const batch = pgFavorites.slice(i, i + BATCH_SIZE);
      const mongoFavorites = [];

      for (const pgFavorite of batch) {
        try {
          const userId = userMapping[pgFavorite.user_id];
          const productId = productMapping[pgFavorite.product_id];
          
          if (!userId) {
            console.warn(chalk.yellow(`⚠️  User ID ${pgFavorite.user_id} non trouvé`));
            stats.favorites.failed++;
            continue;
          }

          const mongoFavorite = {
            _id: new mongoose.Types.ObjectId(),
            userId: userId,
            productId: productId,
            
            productSnapshot: {
              name: pgFavorite.product_name,
              brand: pgFavorite.product_brand,
              barcode: pgFavorite.product_barcode,
              imageUrl: pgFavorite.product_image,
              category: pgFavorite.product_category || 'food',
              healthScore: pgFavorite.health_score
            },
            
            notes: '',
            tags: [],
            
            notifications: {
              priceDrops: false,
              betterAlternatives: false,
              recallAlerts: true
            },
            
            createdAt: pgFavorite.created_at
          };

          mongoFavorites.push(mongoFavorite);
        } catch (error) {
          console.error(chalk.red(`❌ Erreur mapping favori:`, error.message));
          stats.favorites.failed++;
        }
      }

      // Insérer le batch dans MongoDB
      if (mongoFavorites.length > 0) {
        try {
          await Favorite.insertMany(mongoFavorites, { ordered: false });
          stats.favorites.migrated += mongoFavorites.length;
          spinner.text = `Migration favoris: ${stats.favorites.migrated}/${stats.favorites.total}`;
        } catch (error) {
          console.error(chalk.red('❌ Erreur insertion batch favoris:'), error.message);
          stats.favorites.failed += mongoFavorites.length;
        }
      }
    }

    spinner.succeed(chalk.green(`✅ Favoris migrés: ${stats.favorites.migrated}/${stats.favorites.total}`));
  } catch (error) {
    spinner.fail(chalk.red('❌ Erreur migration favoris'));
    console.error(error);
  }
}

// Fonction principale de migration
async function migrate() {
  console.log(chalk.bold.cyan('\n🚀 ECOLOJIA - Migration PostgreSQL vers MongoDB\n'));
  
  try {
    // Connexion MongoDB
    const mongoSpinner = createSpinner('Connexion à MongoDB...');
    mongoSpinner.start();
    
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 10
    });
    
    mongoSpinner.succeed(chalk.green('✅ MongoDB connecté'));
    
    // Test connexion PostgreSQL
    const pgSpinner = createSpinner('Test connexion PostgreSQL...');
    pgSpinner.start();
    
    const { rows } = await pgPool.query('SELECT COUNT(*) FROM users');
    pgSpinner.succeed(chalk.green(`✅ PostgreSQL connecté - ${rows[0].count} utilisateurs trouvés`));
    
    // Demander confirmation
    console.log(chalk.yellow('\n⚠️  Cette migration va :'));
    console.log(chalk.yellow('   - Migrer tous les utilisateurs'));
    console.log(chalk.yellow('   - Migrer tous les produits'));
    console.log(chalk.yellow('   - Migrer toutes les analyses'));
    console.log(chalk.yellow('   - Migrer tous les favoris'));
    console.log(chalk.yellow('\n   Les données existantes dans MongoDB seront conservées.\n'));
    
    // Migration séquentielle
    await migrateUsers();
    await migrateProducts();
    await migrateAnalyses();
    await migrateFavorites();
    
    // Rapport final
    console.log(chalk.bold.cyan('\n📊 RAPPORT DE MIGRATION\n'));
    console.log(chalk.white('Utilisateurs :'), 
      chalk.green(`${stats.users.migrated} migrés`), 
      chalk.red(`${stats.users.failed} échoués`));
    console.log(chalk.white('Produits     :'), 
      chalk.green(`${stats.products.migrated} migrés`), 
      chalk.red(`${stats.products.failed} échoués`));
    console.log(chalk.white('Analyses     :'), 
      chalk.green(`${stats.analyses.migrated} migrées`), 
      chalk.red(`${stats.analyses.failed} échouées`));
    console.log(chalk.white('Favoris      :'), 
      chalk.green(`${stats.favorites.migrated} migrés`), 
      chalk.red(`${stats.favorites.failed} échoués`));
    
    const totalMigrated = stats.users.migrated + stats.products.migrated + 
                         stats.analyses.migrated + stats.favorites.migrated;
    const totalFailed = stats.users.failed + stats.products.failed + 
                       stats.analyses.failed + stats.favorites.failed;
    
    console.log(chalk.bold('\nTOTAL        :'), 
      chalk.green(`${totalMigrated} entrées migrées`), 
      chalk.red(`${totalFailed} échecs`));
    
    console.log(chalk.bold.green('\n✅ Migration terminée avec succès !\n'));
    
  } catch (error) {
    console.error(chalk.bold.red('\n❌ ERREUR FATALE DE MIGRATION\n'));
    console.error(error);
    process.exit(1);
  } finally {
    // Fermer les connexions
    await mongoose.connection.close();
    await pgPool.end();
  }
}

// Vérifier si exécuté directement
if (require.main === module) {
  migrate().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { migrate };
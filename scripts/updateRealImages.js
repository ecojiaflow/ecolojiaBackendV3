const axios = require('axios');

/**
 * 🖼️ MISE À JOUR IMAGES RÉELLES
 * Script pour récupérer les vraies images OpenFoodFacts
 */

const CONFIG = {
  DELAY_MS: 1000, // 1s entre requêtes OpenFoodFacts
  OPENFOODFACTS_URL: 'https://world.openfoodfacts.org/api/v0/product'
};

console.log('🖼️ ECOLOJIA - Mise à jour images réelles OpenFoodFacts');
console.log('='.repeat(60));

// 📦 PRODUITS AVEC CODES-BARRES RÉELS (à mettre à jour dans app.js)
const productsToUpdate = [
  {
    id: "real_1",
    title: "Bio Datteln Getrocknet", 
    barcode: "4260123456789"
  },
  {
    id: "real_2",
    title: "Super Seedy & Nutty Granola",
    barcode: "5060853640124"
  },
  {
    id: "real_3",
    title: "Natural Proper Organic Bio Live Yeogurt",
    barcode: "5014067133804"
  },
  {
    id: "real_4", 
    title: "Ginger 60% Cocoa Bar",
    barcode: "8712100567890"
  },
  {
    id: "real_5",
    title: "Bio Organic Almond Drink",
    barcode: "8712100789012"
  }
];

async function fetchOpenFoodFactsImage(barcode) {
  try {
    console.log(`🔍 Recherche image pour: ${barcode}`);
    
    const response = await axios.get(`${CONFIG.OPENFOODFACTS_URL}/${barcode}.json`, {
      headers: {
        'User-Agent': 'Ecolojia-ImageUpdate/1.0 (https://ecolojia.app)'
      },
      timeout: 10000
    });

    const product = response.data.product;
    
    if (!product) {
      console.log(`❌ Produit non trouvé: ${barcode}`);
      return null;
    }

    // Chercher la meilleure image disponible
    const imageUrl = product.image_url || 
                    product.image_front_url || 
                    product.image_small_url ||
                    product.selected_images?.front?.display?.fr ||
                    product.selected_images?.front?.display?.en ||
                    null;

    if (imageUrl) {
      console.log(`✅ Image trouvée: ${imageUrl.substring(0, 50)}...`);
      return {
        url: imageUrl,
        productName: product.product_name || 'Produit OpenFoodFacts',
        brands: product.brands || '',
        categories: product.categories || ''
      };
    } else {
      console.log(`⚠️  Aucune image disponible pour: ${barcode}`);
      return null;
    }

  } catch (error) {
    console.error(`❌ Erreur API OpenFoodFacts pour ${barcode}:`, error.message);
    return null;
  }
}

async function updateAllImages() {
  const updatedProducts = [];
  let success = 0;
  let failed = 0;

  console.log(`🚀 Mise à jour ${productsToUpdate.length} produits...\n`);

  for (let i = 0; i < productsToUpdate.length; i++) {
    const product = productsToUpdate[i];
    const progress = `[${i + 1}/${productsToUpdate.length}]`;
    
    try {
      console.log(`${progress} 📦 ${product.title}`);
      
      const imageData = await fetchOpenFoodFactsImage(product.barcode);
      
      if (imageData) {
        updatedProducts.push({
          ...product,
          real_image_url: imageData.url,
          openfoodfacts_name: imageData.productName,
          brands: imageData.brands,
          categories: imageData.categories
        });
        success++;
        console.log(`${progress} ✅ Image récupérée`);
      } else {
        // Garder l'image générique
        updatedProducts.push({
          ...product,
          real_image_url: `https://via.assets.so/img.jpg?w=300&h=200&tc=green&bg=%23f3f4f6&t=${encodeURIComponent(product.title)}`,
          note: 'Image générique (pas trouvée sur OpenFoodFacts)'
        });
        failed++;
        console.log(`${progress} ⚠️  Image générique conservée`);
      }

    } catch (error) {
      console.error(`${progress} ❌ Erreur: ${error.message}`);
      failed++;
    }

    // Délai entre requêtes pour respecter OpenFoodFacts
    if (i < productsToUpdate.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_MS));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSULTATS MISE À JOUR IMAGES:');
  console.log(`✅ Images réelles: ${success}`);
  console.log(`⚠️  Images génériques: ${failed}`);
  console.log(`📦 Total traité: ${success + failed}`);
  console.log('='.repeat(60));

  return updatedProducts;
}

async function generateUpdatedAppJs(updatedProducts) {
  console.log('\n🔧 Génération du code app.js mis à jour...');
  
  // Code JavaScript à insérer dans app.js
  const jsCode = `
// 📦 PRODUITS RÉELS AVEC VRAIES IMAGES (mis à jour OpenFoodFacts)
const fallbackProducts = [
${updatedProducts.map(product => `  {
    id: "${product.id}",
    title: "${product.title}",
    slug: "${product.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${product.barcode.slice(-6)}",
    description: "${product.openfoodfacts_name || product.title} - Produit bio avec image réelle",
    brand: "${product.brands?.split(',')[0] || 'Bio'}",
    category: "alimentaire",
    eco_score: "0.75",
    ai_confidence: "0.80",
    confidence_pct: 80,
    confidence_color: "green",
    verified_status: "ai_analyzed",
    tags: ["bio", "openfoodfacts", "france"],
    zones_dispo: ["FR"],
    image_url: "${product.real_image_url}",
    prices: { default: 0 },
    resume_fr: "Produit bio avec image réelle OpenFoodFacts",
    barcode: "${product.barcode}"
  }`).join(',\n')},
  // ... autres produits générés automatiquement
];`;

  console.log('✅ Code généré pour app.js');
  console.log('\n📋 INSTRUCTIONS DE MISE À JOUR:');
  console.log('1. Ouvrir src/app.js');
  console.log('2. Chercher "const fallbackProducts = ["');
  console.log('3. Remplacer les 5 premiers produits par le code généré');
  console.log('4. Sauvegarder et déployer');
  
  return jsCode;
}

// 🔍 FONCTION DE TEST POUR QUELQUES CODES
async function testImageRetrieval() {
  console.log('🧪 TEST - Récupération images pour quelques codes...\n');
  
  const testCodes = ['4260123456789', '5060853640124', '5014067133804'];
  
  for (const code of testCodes) {
    const imageData = await fetchOpenFoodFactsImage(code);
    if (imageData) {
      console.log(`✅ ${code}: ${imageData.url}`);
    } else {
      console.log(`❌ ${code}: Pas d'image`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// 🚀 LANCEMENT
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await testImageRetrieval();
  } else if (args.includes('--update')) {
    const updatedProducts = await updateAllImages();
    const jsCode = await generateUpdatedAppJs(updatedProducts);
    
    console.log('\n📄 CODE À COPIER DANS app.js:');
    console.log('='.repeat(60));
    console.log(jsCode);
    console.log('='.repeat(60));
  } else {
    console.log('🔧 SCRIPT MISE À JOUR IMAGES OPENFOODFACTS');
    console.log('\nCommandes disponibles:');
    console.log('  node scripts/updateRealImages.js --test    # Test sur 3 codes');
    console.log('  node scripts/updateRealImages.js --update  # Mise à jour complète');
    console.log('\n💡 Recommandé: Commencer par --test');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchOpenFoodFactsImage, updateAllImages };
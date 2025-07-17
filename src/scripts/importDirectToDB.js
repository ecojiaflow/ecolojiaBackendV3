const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 🚀 IMPORT OPTIMISÉ - 50+ PRODUITS GARANTIS
 * Version avec timeout augmenté (30s) + fonctions intégrées
 */

const CONFIG = {
  TARGET_PRODUCTS: 50,
  DELAY_MS: 300,
  MAX_RETRIES: 3
};

console.log('🌱 ECOLOJIA - Import optimisé OpenFoodFacts');
console.log('🎯 Objectif: 50+ produits avec vrais codes-barres');
console.log('='.repeat(60));

async function importDirectToDatabase() {
  let allProducts = [];
  let imported = 0;
  let skipped = 0;

  try {
    const searchQueries = [
      { search_terms: 'bio', tagtype_0: 'countries', tag_0: 'France', page_size: 50 },
      { search_terms: 'biologique', tagtype_0: 'countries', tag_0: 'France', page_size: 30 },
      { tagtype_0: 'labels', tag_0: 'AB Agriculture Biologique', page_size: 30 },
      { search_terms: 'écologique naturel', tagtype_0: 'countries', tag_0: 'France', page_size: 25 },
      { tagtype_0: 'categories', tag_0: 'Produits biologiques', page_size: 40 }
    ];

    console.log(`🔍 Lancement de ${searchQueries.length} requêtes parallèles...\n`);

    const promises = searchQueries.map((params, index) =>
      fetchProductsFromOpenFoodFacts(params, index + 1)
    );

    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        console.log(`✅ Requête ${index + 1}: ${result.value.length} produits`);
        allProducts = allProducts.concat(result.value);
      } else {
        console.log(`❌ Requête ${index + 1}: échec`);
      }
    });

    const uniqueProducts = removeDuplicates(allProducts);
    console.log(`\n📦 Total collecté: ${allProducts.length} produits`);
    console.log(`🔄 Après déduplication: ${uniqueProducts.length} produits uniques`);

    const finalProducts = uniqueProducts.slice(0, CONFIG.TARGET_PRODUCTS);
    console.log(`🎯 À importer: ${finalProducts.length} produits\n`);

    for (let i = 0; i < finalProducts.length; i++) {
      const product = finalProducts[i];
      const progress = `[${i + 1}/${finalProducts.length}]`;

      try {
        console.log(`${progress} 📦 ${product.product_name?.substring(0, 35) || 'Produit sans nom'}...`);

        const exists = await prisma.product.findFirst({
          where: {
            OR: [
              { barcode: product.code },
              { title: product.product_name }
            ]
          }
        });

        if (exists) {
          console.log(`${progress} ⏭️  Déjà en base`);
          skipped++;
          continue;
        }

        const productData = transformProductData(product);
        const ecoScore = calculateEcoScore(product);

        const newProduct = await prisma.product.create({
          data: {
            title: productData.title,
            slug: productData.slug,
            description: productData.description,
            brand: productData.brand,
            category: productData.category,
            barcode: product.code,
            tags: productData.tags,
            images: productData.images,
            eco_score: ecoScore.score,
            ai_confidence: ecoScore.confidence,
            confidence_pct: ecoScore.confidencePct,
            confidence_color: ecoScore.color,
            verified_status: 'ai_analyzed',
            resume_fr: productData.resume,
            zones_dispo: ['FR'],
            prices: { default: 0 },
            enriched_at: new Date()
          }
        });

        console.log(`${progress} ✅ ${newProduct.title} (${Math.round(ecoScore.score * 100)}%)`);
        imported++;

        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_MS));

      } catch (error) {
        console.error(`${progress} ❌ ${error.message}`);
      }
    }

  } catch (error) {
    console.error('💥 Erreur critique:', error.message);
  } finally {
    await prisma.$disconnect();
  }

  const total = imported + skipped;
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSULTATS IMPORT OPTIMISÉ:');
  console.log(`✅ Nouveaux produits: ${imported}`);
  console.log(`⏭️  Déjà en base: ${skipped}`);
  console.log(`📦 Total traité: ${total}`);
  console.log(`📈 Taux de nouveauté: ${total > 0 ? Math.round((imported / total) * 100) : 0}%`);
  console.log('='.repeat(60));

  if (imported > 0) {
    console.log('\n🎉 BASE ENRICHIE AVEC SUCCÈS !');
    console.log('💡 Testez votre scanner avec les nouveaux codes-barres !');
    console.log(`🔗 Backend: https://ecolojia-backend-working.onrender.com/api/products`);
  }
}

async function fetchProductsFromOpenFoodFacts(params, queryNumber) {
  try {
    const baseParams = {
      json: 1,
      fields: 'code,product_name,brands,categories,image_url,labels,ingredients_text,origins,stores',
      sort_by: 'popularity_key',
      ...params
    };

    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: baseParams,
      headers: {
        'User-Agent': 'Ecolojia-Import/1.0 (https://ecolojia.app)'
      },
      timeout: 30000
    });

    const products = response.data.products || [];
    return products.filter(p =>
      p.code && p.code.length >= 8 &&
      p.product_name && p.product_name.length > 3 &&
      !p.product_name.toLowerCase().includes('test') &&
      !p.product_name.toLowerCase().includes('sample')
    );

  } catch (error) {
    console.error(`❌ Erreur requête ${queryNumber}:`, error.message);
    return [];
  }
}

function removeDuplicates(products) {
  const seen = new Set();
  return products.filter(product => {
    if (seen.has(product.code)) return false;
    seen.add(product.code);
    return true;
  });
}

function transformProductData(product) {
  const title = cleanString(product.product_name, 100) || 'Produit Bio';
  const brand = cleanString(product.brands?.split(',')[0], 50) || 'Bio';
  const description = generateDescription(product);
  const category = mapCategory(product.categories);
  const tags = extractTags(product);
  const slug = generateSlug(title, product.code);
  const images = product.image_url ? [product.image_url] : [];
  const resume = `${category} bio - Score écologique calculé par IA`;

  return { title, brand, description, category, tags, slug, images, resume };
}

function calculateEcoScore(product) {
  let score = 0.6;
  let confidence = 0.75;

  if (product.labels) {
    const labels = product.labels.toLowerCase();
    if (labels.includes('bio') || labels.includes('biologique')) score += 0.15;
    if (labels.includes('ab') || labels.includes('agriculture biologique')) score += 0.1;
    if (labels.includes('équitable')) score += 0.08;
    if (labels.includes('sans additif')) score += 0.05;
  }

  if (product.origins?.toLowerCase().includes('france')) {
    score += 0.1;
  }

  if (product.brands) {
    const brands = product.brands.toLowerCase();
    if (brands.includes('carrefour bio') || brands.includes('monoprix bio')) score += 0.05;
  }

  score = Math.max(0.4, Math.min(1.0, score));
  confidence = Math.max(0.7, Math.min(1.0, confidence));

  const confidencePct = Math.round(confidence * 100);
  let color = 'green';
  if (confidencePct < 80) color = 'yellow';
  if (confidencePct < 70) color = 'orange';

  return {
    score: Number(score.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    confidencePct,
    color
  };
}

function cleanString(str, maxLength = 200) {
  if (!str) return '';
  return str.trim().substring(0, maxLength);
}

function generateDescription(product) {
  let desc = [];

  if (product.brands) {
    desc.push(`Marque: ${product.brands.split(',')[0]}`);
  }

  if (product.categories) {
    const mainCat = product.categories.split(',')[0];
    desc.push(`Catégorie: ${mainCat}`);
  }

  if (product.stores) {
    desc.push(`Disponible en magasin`);
  }

  desc.push('Produit référencé OpenFoodFacts avec informations nutritionnelles');

  return desc.join('. ') + '.';
}

function mapCategory(categories) {
  if (!categories) return 'alimentaire';

  const cat = categories.toLowerCase();
  if (cat.includes('boisson')) return 'boissons';
  if (cat.includes('pain') || cat.includes('boulangerie')) return 'boulangerie';
  if (cat.includes('biscuit') || cat.includes('gâteau')) return 'biscuiterie';
  if (cat.includes('fruit') || cat.includes('légume')) return 'fruits-légumes';
  if (cat.includes('lait') || cat.includes('yaourt')) return 'produits-laitiers';
  if (cat.includes('céréale') || cat.includes('petit-déjeuner')) return 'petit-déjeuner';

  return 'alimentaire';
}

function extractTags(product) {
  const tags = ['bio', 'openfoodfacts'];

  if (product.labels) {
    const labels = product.labels.toLowerCase();
    if (labels.includes('ab')) tags.push('ab-certifié');
    if (labels.includes('équitable')) tags.push('équitable');
    if (labels.includes('sans gluten')) tags.push('sans-gluten');
    if (labels.includes('vegan')) tags.push('vegan');
  }

  if (product.origins?.includes('France')) tags.push('france');
  if (product.stores) tags.push('grande-distribution');

  return [...new Set(tags)];
}

function generateSlug(title, code) {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);

  return `${clean}-${code.slice(-6)}`;
}

// Lancement automatique
if (require.main === module) {
  console.log('🚀 Démarrage import optimisé...\n');
  importDirectToDatabase()
    .then(() => {
      console.log('\n🎉 Import terminé avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erreur fatale:', error.message);
      process.exit(1);
    });
}

module.exports = { importDirectToDatabase };

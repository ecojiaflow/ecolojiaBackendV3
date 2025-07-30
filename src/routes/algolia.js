// ═══════════════════════════════════════════════════════════════════════
// backend/src/routes/algolia.js - Compatible avec algoliasearch v5
// ═══════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { algoliasearch } = require('algoliasearch'); // Version 5 utilise un export nommé

// Initialiser Algolia
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID || 'test',
  process.env.ALGOLIA_ADMIN_KEY || 'test'
);

// POST /api/algolia/sync
router.post('/sync', async (req, res) => {
  try {
    const Product = require('../models/Product');
    
    console.log('[Algolia] Starting sync...');
    
    // Récupérer tous les produits
    const products = await Product.find()
      .select('name brand barcode category foodData cosmeticsData detergentsData analysisData imageUrl')
      .limit(1000); // Limiter pour éviter timeout
    
    // Formatter pour Algolia
    const objects = products.map(product => ({
      objectID: product._id.toString(),
      name: product.name || 'Produit sans nom',
      brand: product.brand || 'Marque inconnue',
      barcode: product.barcode || '',
      category: product.category || 'food',
      healthScore: product.analysisData?.healthScore || 
                   product.foodData?.nutriScore ? (105 - product.foodData.nutriScore.charCodeAt(0)) * 20 : 50,
      novaGroup: product.foodData?.novaScore || 0,
      nutriScore: product.foodData?.nutriScore || '',
      ecoScore: product.foodData?.ecoScore || '',
      imageUrl: product.imageUrl || '',
      _tags: [
        product.category || 'food', 
        product.foodData?.novaScore ? `nova${product.foodData.novaScore}` : 'nova-unknown',
        product.foodData?.nutriScore ? `nutri${product.foodData.nutriScore}` : 'nutri-unknown'
      ]
    }));

    // Envoyer à Algolia avec le nouveau client v5
    const index = client.initIndex('products');
    const { taskID, objectIDs } = await index.saveObjects(objects);
    
    console.log(`[Algolia] Synced ${objectIDs.length} products with taskID: ${taskID}`);

    res.json({
      success: true,
      synced: objectIDs.length,
      taskID,
      message: `${objectIDs.length} produits synchronisés`
    });

  } catch (error) {
    console.error('[Algolia] Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la synchronisation',
      message: error.message
    });
  }
});

// GET /api/algolia/search
router.get('/search', async (req, res) => {
  try {
    const { query = '', filters = '', page = 0 } = req.query;
    
    console.log('[Algolia] Search:', query, filters);

    const index = client.initIndex('products');
    const { hits, nbHits, page: currentPage, nbPages } = await index.search(query, {
      filters,
      page: parseInt(page),
      hitsPerPage: 20,
      attributesToRetrieve: ['objectID', 'name', 'brand', 'category', 'healthScore', 'imageUrl', 'nutriScore', 'novaGroup']
    });

    res.json({
      success: true,
      hits,
      nbHits,
      page: currentPage,
      nbPages
    });

  } catch (error) {
    console.error('[Algolia] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche',
      message: error.message
    });
  }
});

// POST /api/algolia/configure
router.post('/configure', async (req, res) => {
  try {
    console.log('[Algolia] Configuring index...');

    const index = client.initIndex('products');
    
    // Configuration de l'index pour v5
    const { taskID } = await index.setSettings({
      searchableAttributes: [
        'name',
        'brand',
        'barcode'
      ],
      attributesForFaceting: [
        'category',
        'filterOnly(healthScore)',
        'filterOnly(novaGroup)',
        'filterOnly(nutriScore)'
      ],
      customRanking: [
        'desc(healthScore)'
      ],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      hitsPerPage: 20,
      attributesToRetrieve: [
        'objectID',
        'name',
        'brand',
        'category',
        'healthScore',
        'imageUrl',
        'nutriScore',
        'novaGroup',
        'ecoScore'
      ]
    });

    res.json({
      success: true,
      taskID,
      message: 'Index Algolia configuré'
    });

  } catch (error) {
    console.error('[Algolia] Config error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur configuration Algolia',
      message: error.message
    });
  }
});

// GET /api/algolia/health
router.get('/health', async (req, res) => {
  try {
    // Test de connexion avec v5
    const index = client.initIndex('products');
    const { nbHits } = await index.search('', { 
      hitsPerPage: 1,
      attributesToRetrieve: ['objectID']
    });
    
    res.json({
      success: true,
      service: 'algolia',
      version: 'v5',
      configured: !!process.env.ALGOLIA_APP_ID,
      indexSize: nbHits,
      timestamp: new Date()
    });
  } catch (error) {
    res.json({
      success: false,
      service: 'algolia',
      error: error.message,
      hint: 'Vérifiez vos clés API Algolia dans les variables d\'environnement'
    });
  }
});

// GET /api/algolia/stats - Statistiques de l'index
router.get('/stats', async (req, res) => {
  try {
    const index = client.initIndex('products');
    
    // Récupérer les stats par catégorie
    const foodHits = await index.search('', { 
      filters: 'category:food',
      hitsPerPage: 0,
      attributesToRetrieve: []
    });
    
    const cosmeticsHits = await index.search('', { 
      filters: 'category:cosmetics',
      hitsPerPage: 0,
      attributesToRetrieve: []
    });
    
    const detergentsHits = await index.search('', { 
      filters: 'category:detergents',
      hitsPerPage: 0,
      attributesToRetrieve: []
    });
    
    res.json({
      success: true,
      stats: {
        total: foodHits.nbHits + cosmeticsHits.nbHits + detergentsHits.nbHits,
        byCategory: {
          food: foodHits.nbHits,
          cosmetics: cosmeticsHits.nbHits,
          detergents: detergentsHits.nbHits
        },
        lastSync: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[Algolia] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      message: error.message
    });
  }
});

module.exports = router;
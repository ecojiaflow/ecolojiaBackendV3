// ═══════════════════════════════════════════════════════════════════════
// 4. backend/src/routes/algolia.js
// ═══════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const algoliasearch = require('algoliasearch');

// Initialiser Algolia
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
);
const index = client.initIndex('products');

// POST /api/algolia/sync
router.post('/sync', async (req, res) => {
  try {
    const Product = require('../models/Product');
    
    console.log('[Algolia] Starting sync...');
    
    // Récupérer tous les produits
    const products = await Product.find({ status: 'active' })
      .select('name brand barcode category scores images')
      .limit(1000); // Limiter pour éviter timeout
    
    // Formatter pour Algolia
    const objects = products.map(product => ({
      objectID: product._id.toString(),
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      category: product.category,
      healthScore: product.scores?.healthScore || 0,
      novaGroup: product.scores?.nova || 0,
      imageUrl: product.images?.front || '',
      _tags: [product.category, `nova${product.scores?.nova || 0}`]
    }));

    // Envoyer à Algolia
    const { objectIDs } = await index.saveObjects(objects);
    
    console.log(`[Algolia] Synced ${objectIDs.length} products`);

    res.json({
      success: true,
      synced: objectIDs.length,
      message: `${objectIDs.length} produits synchronisés`
    });

  } catch (error) {
    console.error('[Algolia] Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la synchronisation'
    });
  }
});

// GET /api/algolia/search
router.get('/search', async (req, res) => {
  try {
    const { query = '', filters = '', page = 0 } = req.query;
    
    console.log('[Algolia] Search:', query, filters);

    const results = await index.search(query, {
      filters,
      page: parseInt(page),
      hitsPerPage: 20,
      attributesToRetrieve: ['name', 'brand', 'category', 'healthScore', 'imageUrl']
    });

    res.json({
      success: true,
      hits: results.hits,
      nbHits: results.nbHits,
      page: results.page,
      nbPages: results.nbPages
    });

  } catch (error) {
    console.error('[Algolia] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche'
    });
  }
});

// POST /api/algolia/configure
router.post('/configure', async (req, res) => {
  try {
    console.log('[Algolia] Configuring index...');

    // Configuration de l'index
    await index.setSettings({
      searchableAttributes: [
        'name',
        'brand',
        'barcode'
      ],
      attributesForFaceting: [
        'category',
        'filterOnly(healthScore)',
        'filterOnly(novaGroup)'
      ],
      customRanking: [
        'desc(healthScore)'
      ],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>'
    });

    res.json({
      success: true,
      message: 'Index Algolia configuré'
    });

  } catch (error) {
    console.error('[Algolia] Config error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur configuration Algolia'
    });
  }
});

// GET /api/algolia/health
router.get('/health', async (req, res) => {
  try {
    // Test de connexion
    const stats = await index.search('', { hitsPerPage: 1 });
    
    res.json({
      success: true,
      service: 'algolia',
      configured: !!process.env.ALGOLIA_APP_ID,
      indexSize: stats.nbHits,
      timestamp: new Date()
    });
  } catch (error) {
    res.json({
      success: false,
      service: 'algolia',
      error: error.message
    });
  }
});

module.exports = router;
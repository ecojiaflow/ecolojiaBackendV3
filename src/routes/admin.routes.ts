// PATH: backend/src/routes/admin.routes.ts
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ─────────────────────────────────────────────
// 🔁 Données simulées (temporaire)
// ─────────────────────────────────────────────
const logs = [
  {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    status: 'success',
    productsProcessed: 25,
    productsSuccess: 23,
    productsFailed: 2,
    duration: 63,
    fileName: 'openfood-2025-07-17.json.gz'
  }
];

const products = [...Array(10)].map((_, i) => ({
  id: uuidv4(),
  title: `Produit ${i + 1}`,
  slug: `produit-${i + 1}`,
  category: ['alimentaire', 'cosmetic', 'detergent'][i % 3],
  brand: 'Marque Démo',
  eco_score: Math.floor(Math.random() * 100),
  ai_confidence: Math.floor(Math.random() * 20 + 70),
  confidence_color: ['green', 'orange', 'red'][i % 3] as 'green' | 'orange' | 'red',
  verified_status: 'pending',
  created_at: new Date().toISOString(),
  image_url: 'https://via.placeholder.com/64'
}));

// ─────────────────────────────────────────────
// 📊 /dashboard
// ─────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalProducts: 10421,
      totalImports: 19,
      lastImportDate: new Date().toISOString(),
      successRate: 92.5,
      averageConfidence: 84.2,
      productsByCategory: {
        alimentaire: 8800,
        cosmetic: 1021,
        detergent: 600
      },
      recentActivity: [
        { date: '2025-07-16', action: 'import', count: 2300 },
        { date: '2025-07-15', action: 'scan', count: 112 },
        { date: '2025-07-14', action: 'delete', count: 7 }
      ]
    }
  });
});

// ─────────────────────────────────────────────
// 📦 /recent-products
// ─────────────────────────────────────────────
router.get('/recent-products', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json({ success: true, data: products.slice(0, limit) });
});

// ─────────────────────────────────────────────
// 📄 /import-logs
// ─────────────────────────────────────────────
router.get('/import-logs', (req, res) => {
  res.json({ success: true, data: logs });
});

// ─────────────────────────────────────────────
// 🚀 /trigger-import
// ─────────────────────────────────────────────
router.post('/trigger-import', (req, res) => {
  const importId = uuidv4();
  console.log(`🧠 Simulation import déclenchée ID: ${importId}`);
  res.json({ success: true, data: { message: 'Import simulé lancé', importId } });
});

export default router;
// EOF

// backend/src/routes/multiCategory.routes.js
// Routes Express pour les analyses multi-catégories ECOLOJIA

const express = require('express');
const router = express.Router();

// Mock data pour les catégories
const categories = [
  {
    id: 'food',
    name: 'Alimentaire',
    description: 'Analyse nutritionnelle et détection ultra-transformation des produits alimentaires selon NOVA et EFSA',
    icon: '🍎',
    color: '#7DDE4A',
    features: [
      'Classification NOVA',
      'Index glycémique',
      'Additifs dangereux',
      'Alternatives bio'
    ],
    available: true
  },
  {
    id: 'cosmetics',
    name: 'Cosmétiques',
    description: 'Analyse des ingrédients cosmétiques et détection des perturbateurs endocriniens selon ANSM',
    icon: '💄',
    color: '#FF69B4',
    features: [
      'Ingrédients toxiques',
      'Certification bio',
      'Tests animaux',
      'Alternatives naturelles'
    ],
    available: true
  },
  {
    id: 'detergents',
    name: 'Détergents',
    description: 'Impact environnemental et santé des produits ménagers selon REACH et ECHA',
    icon: '🧽',
    color: '#4FC3F7',
    features: [
      'Biodégradabilité',
      'Toxicité aquatique',
      'Émissions COV',
      'Recettes DIY'
    ],
    available: true
  }
];

// ===============================
// GET /api/multi-category/categories
// ===============================
router.get('/categories', (req, res) => {
  try {
    console.log('📋 Demande liste catégories multi-analyses');
    
    res.json({
      success: true,
      categories: categories,
      total_categories: categories.length,
      default_category: 'food',
      api_version: '1.0',
      timestamp: new Date().toISOString(),
      message: 'Catégories multi-analyses ECOLOJIA disponibles'
    });

  } catch (error) {
    console.error('❌ Erreur récupération catégories:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des catégories',
      categories: []
    });
  }
});

// ===============================
// POST /api/multi-category/analyze
// ===============================
router.post('/analyze', (req, res) => {
  try {
    console.log('🧪 Demande analyse multi-catégorie:', req.body);

    const { product, context = {} } = req.body;

    // Validation basique
    if (!product || !product.title) {
      return res.status(400).json({
        success: false,
        error: 'Données produit manquantes',
        message: 'Le champ product.title est requis'
      });
    }

    // Détection automatique de catégorie basée sur le titre/ingrédients
    const detectedCategory = detectProductCategory(product);
    
    // Simulation d'analyse selon la catégorie
    const analysisResult = performMockAnalysis(product, detectedCategory);
    
    // Génération d'alternatives basiques
    const alternatives = generateMockAlternatives(detectedCategory);

    console.log(`✅ Analyse ${detectedCategory} terminée pour: ${product.title}`);

    res.json({
      success: true,
      category: detectedCategory,
      detection_confidence: analysisResult.detection_confidence,
      analysis: {
        overall_score: analysisResult.overall_score,
        confidence: analysisResult.confidence,
        sources: [
          'ANSES 2024',
          'EFSA Guidelines',
          'INSERM Research',
          'REACH Database'
        ]
      },
      alternatives: alternatives,
      metadata: {
        processing_time_ms: Math.floor(Math.random() * 500) + 200,
        api_version: '1.0',
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        detection_method: 'keyword_analysis',
        user_context: context
      }
    });

  } catch (error) {
    console.error('❌ Erreur analyse multi-catégorie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'analyse',
      message: error.message
    });
  }
});

// ===============================
// GET /api/multi-category/health
// ===============================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MultiCategory Analysis Service',
    version: '1.0',
    available_categories: categories.map(c => c.id),
    endpoints: [
      'GET /api/multi-category/categories',
      'POST /api/multi-category/analyze',
      'GET /api/multi-category/health'
    ],
    timestamp: new Date().toISOString()
  });
});

// ===============================
// FONCTIONS UTILITAIRES
// ===============================

/**
 * Détection automatique de catégorie basée sur mots-clés
 */
function detectProductCategory(product) {
  const title = (product.title || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const ingredients = (product.ingredients || []).join(' ').toLowerCase();
  
  const text = `${title} ${description} ${ingredients}`;

  // Mots-clés alimentaires
  const foodKeywords = [
    'bio', 'céréales', 'lait', 'yaourt', 'fromage', 'pain', 'biscuit',
    'chocolat', 'sucre', 'huile', 'vinaigre', 'confiture', 'miel',
    'légume', 'fruit', 'viande', 'poisson', 'œuf', 'farine',
    'alimentaire', 'nutrition', 'calories', 'protéines', 'glucides'
  ];

  // Mots-clés cosmétiques
  const cosmeticKeywords = [
    'crème', 'shampooing', 'gel', 'huile', 'sérum', 'masque',
    'démaquillant', 'fond de teint', 'rouge', 'mascara', 'parfum',
    'déodorant', 'dentifrice', 'savon', 'lotion', 'baume',
    'cosmétique', 'beauté', 'soin', 'aqua', 'glycerin', 'paraben'
  ];

  // Mots-clés détergents
  const detergentKeywords = [
    'lessive', 'liquide vaisselle', 'nettoyant', 'détergent',
    'produit ménager', 'dégraissant', 'désinfectant', 'javel',
    'tensioactif', 'phosphate', 'azurant', 'enzymatique',
    'ménager', 'nettoyage', 'entretien', 'surface'
  ];

  // Comptage des correspondances
  const foodScore = foodKeywords.filter(keyword => text.includes(keyword)).length;
  const cosmeticScore = cosmeticKeywords.filter(keyword => text.includes(keyword)).length;
  const detergentScore = detergentKeywords.filter(keyword => text.includes(keyword)).length;

  // Détermination de la catégorie
  if (foodScore >= cosmeticScore && foodScore >= detergentScore) {
    return 'food';
  } else if (cosmeticScore >= detergentScore) {
    return 'cosmetics';
  } else {
    return 'detergents';
  }
}

/**
 * Simulation d'analyse selon la catégorie
 */
function performMockAnalysis(product, category) {
  // Scores différents selon la catégorie
  const baseScores = {
    food: { min: 30, max: 80 },
    cosmetics: { min: 40, max: 85 },
    detergents: { min: 35, max: 75 }
  };

  const range = baseScores[category] || baseScores.food;
  const overall_score = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  
  // Ajustement selon des critères simples
  let scoreAdjustment = 0;
  
  // Bonus si "bio" dans le titre
  if ((product.title || '').toLowerCase().includes('bio')) {
    scoreAdjustment += 10;
  }
  
  // Pénalité si beaucoup d'ingrédients
  if (product.ingredients && product.ingredients.length > 10) {
    scoreAdjustment -= 5;
  }

  const final_score = Math.max(0, Math.min(100, overall_score + scoreAdjustment));

  return {
    overall_score: final_score,
    confidence: 0.75 + Math.random() * 0.2, // 0.75 à 0.95
    detection_confidence: 0.8 + Math.random() * 0.15 // 0.8 à 0.95
  };
}

/**
 * Génération d'alternatives mock selon la catégorie
 */
function generateMockAlternatives(category) {
  const alternatives = {
    food: [
      {
        name: 'Version maison naturelle',
        type: 'DIY',
        score: 85,
        description: 'Recette simple avec ingrédients naturels',
        why_better: 'Aucun additif, contrôle total des ingrédients'
      },
      {
        name: 'Alternative bio certifiée',
        type: 'Bio',
        score: 78,
        description: 'Produit équivalent avec certification bio',
        why_better: 'Sans pesticides ni additifs controversés'
      }
    ],
    cosmetics: [
      {
        name: 'Cosmétique naturel certifié',
        type: 'Naturel',
        score: 82,
        description: 'Formule à base d\'ingrédients naturels',
        why_better: 'Sans perturbateurs endocriniens ni parabens'
      },
      {
        name: 'Recette DIY simple',
        type: 'DIY',
        score: 88,
        description: 'Préparation maison avec 3-4 ingrédients',
        why_better: 'Économique et sans conservateurs'
      }
    ],
    detergents: [
      {
        name: 'Produit écolabel européen',
        type: 'Écolabel',
        score: 79,
        description: 'Certifié pour son faible impact environnemental',
        why_better: 'Biodégradable et moins toxique pour l\'eau'
      },
      {
        name: 'Solution maison bicarbonate',
        type: 'DIY',
        score: 90,
        description: 'Mélange bicarbonate + vinaigre blanc',
        why_better: 'Efficace, économique et 100% naturel'
      }
    ]
  };

  return alternatives[category] || alternatives.food;
}

module.exports = router;
// 📝 FICHIER COMPLET : src/routes/analyze.routes.js
// Avec intégration DetergentScorer

const { Router } = require('express');
const foodScorer = require('../scorers/food/foodScorer');
const CosmeticScorer = require('../scorers/cosmetic/cosmeticScorer');
const { DetergentScorer } = require('../scorers/detergent/detergentScorer'); // ✨ NOUVEAU

const router = Router();
const cosmeticScorer = new CosmeticScorer();
const detergentScorer = new DetergentScorer(); // ✨ NOUVEAU

/**
 * POST /analyze/food
 * Analyse complète d'un produit avec IA + Scoring scientifique
 */
router.post('/food', async (req, res) => {
  try {
    const { productData, userProfile = {} } = req.body;

    if (!productData) {
      return res.status(400).json({
        success: false,
        error: 'Données produit manquantes'
      });
    }

    const scoringResult = await foodScorer.analyzeFood(productData, userProfile);

    // Filtrage si la confiance est trop basse pour affichage public
    if (scoringResult.confidence < 0.4) {
      return res.status(422).json({
        success: false,
        error: 'Données insuffisantes pour analyse fiable',
        confidence: scoringResult.confidence,
        message: 'Veuillez fournir plus d\'informations sur le produit'
      });
    }

    const response = {
      success: true,
      analysis: {
        score: scoringResult.score,
        grade: scoringResult.grade,
        confidence: scoringResult.confidence,
        confidence_label:
          foodScorer.confidenceCalculator.getInterpretation
            ? foodScorer.confidenceCalculator.getInterpretation(scoringResult.confidence)
            : scoringResult.confidence >= 0.8
            ? 'Très fiable'
            : scoringResult.confidence >= 0.6
            ? 'Fiable'
            : 'Modérée',
        improvement: scoringResult.improvement,
        breakdown: scoringResult.breakdown,
        nova_classification: scoringResult.breakdown?.transformation?.details?.nova || {},
        additives_analysis: scoringResult.breakdown?.transformation?.details?.additives || {},
        recommendations: scoringResult.recommendations || {},
        alternatives: scoringResult.alternatives || [],
        insights: scoringResult.insights || [],
        chat_context: scoringResult.chat_context || null,
        differentiation: scoringResult.differentiation || {},
        sources: scoringResult.meta?.sources || [],
        meta: scoringResult.meta || {}
      },
      disclaimers: [
        "Information éducative - ne remplace pas avis médical",
        "Basé sur données publiques sous licence ODbL",
        scoringResult.confidence < 0.6 ? "🚨 Donnée estimée - fiabilité modérée" : null
      ].filter(Boolean)
    };

    res.json(response);
  } catch (err) {
    console.error('[analyze.food] FATAL:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur interne analyse',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur'
    });
  }
});

/**
 * POST /analyze/cosmetic
 * Analyse complète d'un produit cosmétique selon composition INCI
 */
router.post('/cosmetic', async (req, res) => {
  try {
    console.log('🧴 Requête analyse cosmétique reçue:', req.body);

    // Validation des données d'entrée
    const { product_name, ingredients, composition, inci, category, brand } = req.body;
    
    if (!ingredients && !composition && !inci) {
      return res.status(400).json({
        success: false,
        error: 'Données insuffisantes',
        message: 'Au moins un champ requis : ingredients, composition ou inci',
        required_fields: ['ingredients', 'composition', 'inci']
      });
    }

    // Préparation des données produit
    const productData = {
      name: product_name,
      ingredients: ingredients || composition || inci,
      composition,
      inci,
      category: category || 'cosmétique',
      brand
    };

    console.log('📋 Données produit cosmétique préparées:', productData);

    // Analyse avec le cosmeticScorer
    const analysisResult = await cosmeticScorer.analyzeCosmetic(productData);
    
    // Vérification du seuil de confidence (comme pour food)
    if (analysisResult.confidence < 0.4) {
      console.warn('⚠️ Confidence cosmétique trop faible:', { 
        confidence: analysisResult.confidence,
        threshold: 0.4 
      });
      
      return res.status(422).json({
        success: false,
        error: 'Analyse non fiable',
        message: 'Les données fournies ne permettent pas une analyse suffisamment fiable',
        confidence: analysisResult.confidence,
        min_confidence_required: 0.4,
        suggestions: [
          'Vérifiez la liste INCI complète',
          'Assurez-vous que les ingrédients sont correctement orthographiés',
          'Fournissez plus d\'informations sur le produit'
        ]
      });
    }

    // Génération des alternatives (fallback simple pour l'instant)
    try {
      analysisResult.alternatives = await generateCosmeticAlternatives(productData, analysisResult);
    } catch (altError) {
      console.warn('⚠️ Erreur génération alternatives cosmétique:', altError.message);
      analysisResult.alternatives = [];
      analysisResult.meta.fallback_alternatives = true;
    }

    // Génération des insights éducatifs (fallback simple pour l'instant)
    try {
      analysisResult.insights = generateCosmeticInsights(analysisResult);
    } catch (insightError) {
      console.warn('⚠️ Erreur génération insights cosmétique:', insightError.message);
      analysisResult.insights = [];
      analysisResult.meta.fallback_insights = true;
    }

    // Ajout des disclaimers éducatifs
    const disclaimers = [
      "ℹ️ Analyse basée sur la composition INCI et les bases scientifiques officielles (ANSM, EFSA, SCCS)",
      "⚠️ Les réactions cutanées sont individuelles. Test sur petite zone recommandé",
      "🔬 Ces informations sont éducatives et ne remplacent pas l'avis d'un dermatologue",
      "📚 Sources : Base INCI, Classification perturbateurs endocriniens ANSM 2024"
    ];

    // Log du succès
    console.log('✅ Analyse cosmétique réussie:', {
      score: analysisResult.score,
      confidence: analysisResult.confidence,
      endocrine_disruptors: analysisResult.risk_analysis?.endocrine_disruptors?.length || 0,
      allergens: analysisResult.allergen_analysis?.total_allergens || 0,
      processing_time: analysisResult.meta?.processing_time_ms
    });

    // Réponse finale
    res.json({
      success: true,
      type: 'cosmetic',
      product: {
        name: productData.name,
        category: productData.category,
        brand: productData.brand
      },
      analysis: analysisResult,
      disclaimers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur analyse cosmétique:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur',
      message: 'Impossible d\'analyser ce produit cosmétique',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /analyze/cosmetic/dev
 * Route de développement pour ignorer le seuil de confidence
 */
router.post('/cosmetic/dev', async (req, res) => {
  try {
    console.log('🧪 Requête analyse cosmétique DEV (seuil ignoré):', req.body);

    // Validation basique
    const { product_name, ingredients, composition, inci, category, brand } = req.body;
    
    if (!ingredients && !composition && !inci) {
      return res.status(400).json({
        success: false,
        error: 'Données insuffisantes',
        message: 'Au moins un champ requis : ingredients, composition ou inci'
      });
    }

    // Préparation des données
    const productData = {
      name: product_name,
      ingredients: ingredients || composition || inci,
      composition,
      inci,
      category: category || 'cosmétique',
      brand
    };

    // Analyse SANS vérification de confidence
    const analysisResult = await cosmeticScorer.analyzeCosmetic(productData);
    
    // Ajout flag développement
    analysisResult.meta.dev_mode = true;
    analysisResult.meta.confidence_threshold_ignored = true;

    // Génération alternatives et insights (même logique que route normale)
    try {
      analysisResult.alternatives = await generateCosmeticAlternatives(productData, analysisResult);
    } catch (altError) {
      analysisResult.alternatives = [];
      analysisResult.meta.fallback_alternatives = true;
    }

    try {
      analysisResult.insights = generateCosmeticInsights(analysisResult);
    } catch (insightError) {
      analysisResult.insights = [];
      analysisResult.meta.fallback_insights = true;
    }

    // Disclaimers spécifiques développement
    const disclaimers = [
      "🧪 MODE DÉVELOPPEMENT : Seuil de confidence ignoré pour tests",
      "ℹ️ Analyse basée sur la composition INCI et les bases scientifiques",
      "⚠️ Résultats à interpréter avec précaution selon la confidence",
      "📚 Sources : ANSM, EFSA, SCCS, Base INCI 2024"
    ];

    console.log('✅ Analyse cosmétique DEV réussie:', {
      score: analysisResult.score,
      confidence: analysisResult.confidence,
      dev_mode: true
    });

    res.json({
      success: true,
      type: 'cosmetic_dev',
      product: productData,
      analysis: analysisResult,
      disclaimers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur analyse cosmétique DEV:', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur',
      message: 'Impossible d\'analyser ce produit cosmétique (mode dev)',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== ✨ NOUVELLES ROUTES DÉTERGENTS ===== 

/**
 * 🧽 POST /analyze/detergent
 * Analyse complète d'un produit ménager/lessive selon REACH/ECHA 2024
 */
router.post('/detergent', async (req, res) => {
  try {
    console.log('🧽 Requête analyse détergent reçue:', req.body);

    const { product_name, ingredients, composition, certifications, brand, category } = req.body;

    // Validation input
    if (!ingredients && !composition) {
      return res.status(400).json({
        success: false,
        error: 'Données insuffisantes',
        message: 'Au moins un champ requis : ingredients ou composition',
        required_fields: ['ingredients', 'composition'],
        expected_format: {
          ingredients: "string ou array d'ingrédients",
          product_name: "string (optionnel)", 
          certifications: "array (optionnel, ex: ['EU ECOLABEL', 'ECOCERT'])",
          category: "string (optionnel, ex: 'lessive', 'détergent')",
          brand: "string (optionnel)"
        }
      });
    }

    // Préparation des données produit
    const ingredientsList = ingredients || composition;
    const productName = product_name || '';
    const certificationsList = Array.isArray(certifications) ? certifications : 
                              typeof certifications === 'string' ? [certifications] : [];

    console.log('📋 Données détergent préparées:', {
      name: productName,
      ingredients_count: Array.isArray(ingredientsList) ? ingredientsList.length : ingredientsList.split(',').length,
      certifications: certificationsList,
      category: category || 'détergent'
    });

    // Analyse avec le DetergentScorer
    const analysisResult = await detergentScorer.analyzeDetergent(
      ingredientsList,
      productName,
      certificationsList
    );

    // Vérification seuil de confiance (cohérent avec autres endpoints)
    if (analysisResult.confidence < 0.4) {
      console.warn('⚠️ Confidence détergent trop faible:', { 
        confidence: analysisResult.confidence,
        threshold: 0.4 
      });
      
      return res.status(422).json({
        success: false,
        error: 'Analyse non fiable',
        message: 'Les données fournies ne permettent pas une analyse suffisamment fiable',
        confidence: analysisResult.confidence,
        min_confidence_required: 0.4,
        suggestions: [
          'Fournir le nom complet du produit',
          'Vérifier la liste complète des ingrédients',
          'Inclure les certifications éventuelles',
          'S\'assurer de l\'orthographe des composants'
        ]
      });
    }

    // Enrichissement avec métadonnées produit
    const enrichedAnalysis = {
      ...analysisResult,
      product_info: {
        name: productName,
        category: category || 'détergent',
        brand: brand || null,
        certifications_declared: certificationsList
      },
      meta: {
        ...analysisResult.meta,
        processing_time_ms: Date.now(),
        analysis_version: 'detergent-v1.0',
        data_sources: ['REACH Database', 'ECHA 2024', 'EU Ecolabel', 'OECD Guidelines']
      }
    };

    // Disclaimers éducatifs spécifiques détergents
    const disclaimers = [
      "ℹ️ Analyse basée sur la réglementation REACH et les bases ECHA 2024",
      "🌊 Impact environnemental évalué selon critères EU Ecolabel et Nordic Swan", 
      "⚠️ Les sensibilités cutanées sont individuelles. Test préalable recommandé",
      "🔬 Ces informations sont éducatives et ne remplacent pas l'avis de professionnels",
      "📚 Sources : REACH, ECHA, OECD, SCCS, études biodégradabilité 2024"
    ];

    console.log('✅ Analyse détergent réussie:', {
      score: analysisResult.score,
      confidence: analysisResult.confidence,
      issues_detected: analysisResult.detected_issues?.length || 0,
      certifications_found: analysisResult.certifications_detected?.length || 0,
      alternatives_count: analysisResult.alternatives?.length || 0
    });

    // Réponse structurée
    res.json({
      success: true,
      type: 'detergent',
      product: {
        name: productName,
        category: category || 'détergent',
        brand: brand || null
      },
      analysis: enrichedAnalysis,
      disclaimers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur analyse détergent:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur',
      message: 'Impossible d\'analyser ce produit détergent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 🧽 POST /analyze/detergent/dev
 * Version développement - ignore seuil de confiance
 */
router.post('/detergent/dev', async (req, res) => {
  try {
    console.log('🧪 Requête analyse détergent DEV (seuil ignoré):', req.body);

    const { product_name, ingredients, composition, certifications, brand, category } = req.body;

    if (!ingredients && !composition) {
      return res.status(400).json({
        success: false,
        error: 'Données insuffisantes pour analyse détergent',
        message: 'Au moins un champ requis : ingredients ou composition',
        example: {
          ingredients: "AQUA, SODIUM LAURYL SULFATE, SODIUM TRIPOLYPHOSPHATE, PARFUM",
          product_name: "Lessive Multi-Usage",
          certifications: ["EU ECOLABEL"],
          category: "lessive"
        }
      });
    }

    // Préparation des données
    const ingredientsList = ingredients || composition;
    const productName = product_name || 'Produit Test DEV';
    const certificationsList = Array.isArray(certifications) ? certifications : 
                              typeof certifications === 'string' ? [certifications] : [];

    console.log('📋 Données détergent DEV préparées:', {
      name: productName,
      ingredients: ingredientsList,
      certifications: certificationsList
    });

    // Analyse SANS vérification de confidence
    const analysisResult = await detergentScorer.analyzeDetergent(
      ingredientsList,
      productName,
      certificationsList
    );
    
    // Ajout flags développement
    const devAnalysis = {
      ...analysisResult,
      meta: {
        ...analysisResult.meta,
        dev_mode: true,
        confidence_threshold_ignored: true,
        analysis_timestamp: new Date().toISOString(),
        debug_info: {
          original_ingredients: ingredientsList,
          processed_ingredients: analysisResult.processed_ingredients || null,
          confidence_details: `${analysisResult.confidence} (seuil 0.4 ignoré)`
        }
      }
    };

    // Disclaimers spécifiques développement
    const disclaimers = [
      "🧪 MODE DÉVELOPPEMENT : Seuil de confidence ignoré pour tests",
      "ℹ️ Analyse basée sur REACH/ECHA - Résultats à interpréter selon confidence",
      "⚠️ Version test - Validation recommandée avec route production",
      "📚 Sources : REACH Database, ECHA 2024, EU Ecolabel criteria"
    ];

    console.log('✅ Analyse détergent DEV réussie:', {
      score: analysisResult.score,
      confidence: analysisResult.confidence,
      dev_mode: true,
      confidence_ignored: true
    });

    res.json({
      success: true,
      type: 'detergent_dev',
      product: {
        name: productName,
        category: category || 'détergent',
        brand: brand || null
      },
      analysis: devAnalysis,
      disclaimers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur analyse détergent DEV:', { 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur',
      message: 'Impossible d\'analyser ce produit détergent (mode dev)',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 📚 GET /analyze/detergent/docs
 * Documentation API détergents
 */
router.get('/detergent/docs', (req, res) => {
  res.json({
    title: '🧽 ECOLOJIA - API Analyse Détergents & Produits Ménagers',
    version: '1.0',
    description: 'Analyse scientifique des produits ménagers selon réglementation REACH et critères ECHA 2024',
    
    endpoints: {
      'POST /api/analyze/detergent': {
        description: 'Analyse complète avec seuil de confiance (production)',
        required: ['ingredients ou composition'],
        optional: ['product_name', 'certifications', 'category', 'brand'],
        response: 'Score + alternatives + insights scientifiques',
        confidence_threshold: 0.4
      },
      'POST /api/analyze/detergent/dev': {
        description: 'Mode développement - ignore seuil confiance',
        required: ['ingredients ou composition'],
        response: 'Analyse complète + métadonnées debug',
        confidence_threshold: 'ignoré'
      },
      'GET /api/analyze/detergent/docs': {
        description: 'Documentation complète API détergents'
      }
    },

    scoring_criteria: {
      ecotoxicity: {
        weight: '30%',
        description: 'Toxicité aquatique selon bases ECHA',
        sources: ['REACH Database', 'ECHA C&L Inventory', 'OECD Guidelines']
      },
      biodegradability: {
        weight: '25%', 
        description: 'Tests biodégradation OECD 301',
        sources: ['EU Ecolabel criteria', 'Nordic Swan standards']
      },
      irritation: {
        weight: '25%',
        description: 'Allergènes et irritants cutanés',
        sources: ['SCCS opinions', 'Cosmetic Regulation EC']
      },
      environmental: {
        weight: '20%',
        description: 'Impact global + certifications',
        sources: ['Life Cycle Assessment', 'Ecolabel criteria']
      }
    },

    harmful_ingredients_detected: {
      'high_penalty': [
        'SODIUM TRIPOLYPHOSPHATE (-40 pts) - Eutrophisation',
        'DICHLOROMETHANE (-50 pts) - Cancérigène suspecté',
        'METHYLISOTHIAZOLINONE (-35 pts) - Allergène sévère',
        'ALKYLBENZENE SULFONATE (-30 pts) - Non biodégradable'
      ],
      'medium_penalty': [
        'SODIUM LAURYL SULFATE (-25 pts) - Irritant sévère',
        'BENZISOTHIAZOLINONE (-20 pts) - Allergène',
        'TETRASODIUM PYROPHOSPHATE (-20 pts) - Eutrophisation'
      ]
    },

    eco_ingredients_bonus: [
      'COCO GLUCOSIDE (+15 pts) - Tensioactif végétal',
      'SODIUM BICARBONATE (+20 pts) - Agent naturel sûr',
      'SODIUM PERCARBONATE (+18 pts) - Blanchiment oxygéné',
      'CITRIC ACID (+15 pts) - Acidifiant naturel',
      'PROTEASE (+10 pts) - Enzyme biodégradable'
    ],

    certifications_supported: {
      'EU ECOLABEL': '+20 pts - Label officiel européen',
      'NORDIC SWAN': '+18 pts - Label nordique strict',  
      'ECOCERT': '+15 pts - Certification bio française',
      'CRADLE TO CRADLE': '+25 pts - Économie circulaire',
      'NATURE ET PROGRES': '+12 pts - Standard bio exigeant'
    },

    example_requests: {
      basic: {
        ingredients: "AQUA, COCO GLUCOSIDE, SODIUM BICARBONATE, CITRIC ACID",
        product_name: "Lessive Écologique"
      },
      with_certifications: {
        ingredients: "AQUA, LAURYL GLUCOSIDE, SODIUM PERCARBONATE, PROTEASE, PARFUM",
        product_name: "Détergent Multi-Surface Bio",
        certifications: ["EU ECOLABEL", "ECOCERT"],
        category: "nettoyant multi-surfaces",
        brand: "Marque Verte"
      },
      problematic: {
        ingredients: "AQUA, SODIUM LAURYL SULFATE, SODIUM TRIPOLYPHOSPHATE, METHYLISOTHIAZOLINONE, BHA",
        product_name: "Lessive Conventionnelle"
      }
    },

    response_structure: {
      success: 'boolean',
      type: 'detergent',
      product: {
        name: 'string',
        category: 'string', 
        brand: 'string'
      },
      analysis: {
        score: 'number (0-100)',
        confidence: 'number (0-1)',
        breakdown: {
          ecotoxicity: 'object - Score + pénalités toxicité',
          biodegradability: 'object - Ratio biodégradable + analyse',
          irritation: 'object - Allergènes + irritants',
          environmental: 'object - Impact + certifications'
        },
        detected_issues: 'array - Problèmes critiques détectés',
        certifications_detected: 'array - Labels trouvés',
        alternatives: 'array - Suggestions plus écologiques',
        insights: 'array - Éducation scientifique',
        methodology: 'string - Sources utilisées'
      }
    },

    scientific_sources: [
      'REACH Database (Registration, Evaluation, Authorisation of Chemicals)',
      'ECHA 2024 (European Chemicals Agency)',
      'EU Ecolabel criteria for detergents',
      'OECD Guidelines for biodegradability testing',
      'SCCS (Scientific Committee on Consumer Safety)',
      'Nordic Swan Ecolabelling criteria',
      'Water Framework Directive 2000/60/EC'
    ],

    analysis_methodology: 'Scoring holistique basé sur réglementation REACH, critères EU Ecolabel, et études récentes biodégradabilité/écotoxicité (2024)'
  });
});

/**
 * GET /analyze/cosmetic/docs
 * Documentation API cosmétique
 */
router.get('/cosmetic/docs', (req, res) => {
  res.json({
    endpoint: '/api/analyze/cosmetic',
    method: 'POST',
    description: 'Analyse scientifique des produits cosmétiques basée sur la composition INCI',
    
    required_fields: {
      one_of: ['ingredients', 'composition', 'inci']
    },
    
    optional_fields: {
      product_name: 'string - Nom du produit',
      category: 'string - Catégorie (crème, shampoing, etc.)',
      brand: 'string - Marque du produit'
    },
    
    response_structure: {
      success: 'boolean',
      type: 'cosmetic',
      product: {
        name: 'string',
        category: 'string',
        brand: 'string'
      },
      analysis: {
        score: 'number (0-100)',
        confidence: 'number (0-1)',
        confidence_label: 'string',
        breakdown: {
          safety: 'object - Sécurité (perturbateurs, toxicité)',
          efficacy: 'object - Efficacité (ingrédients actifs)',
          allergens: 'object - Allergènes détectés',
          formulation: 'object - Qualité formulation'
        },
        risk_analysis: 'object - Perturbateurs endocriniens, toxicité',
        benefit_analysis: 'object - Ingrédients bénéfiques',
        allergen_analysis: 'object - Allergènes et sensibilisation',
        alternatives: 'array - Suggestions alternatives',
        insights: 'array - Insights éducatifs',
        meta: 'object - Métadonnées techniques'
      }
    },
    
    confidence_threshold: 0.4,
    
    example_request: {
      product_name: "Crème Hydratante Visage",
      ingredients: "AQUA, GLYCERIN, CETYL ALCOHOL, DIMETHICONE, BUTYLPARABEN, LIMONENE",
      category: "soin visage",
      brand: "Example Brand"
    },
    
    data_sources: [
      "Base INCI internationale",
      "ANSM (Agence Nationale Sécurité Médicament)",
      "EFSA (European Food Safety Authority)",
      "SCCS (Scientific Committee Consumer Safety)",
      "REVIDAL (Base allergènes dermatologie)"
    ],
    
    analysis_criteria: {
      safety: "Détection perturbateurs endocriniens, ingrédients toxiques",
      efficacy: "Ingrédients actifs à efficacité prouvée",
      allergens: "Allergènes contact selon prévalence",
      formulation: "Complexité, ratio naturel/synthétique"
    }
  });
});

/**
 * GET /analyze/health
 * Vérifie état du service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ECOLOJIA Scoring Engine',
    version: '3.0-sprint3-complete', // ✨ UPDATED
    features: {
      food: ['NOVA', 'EFSA', 'NutriScore', 'IG', 'Alternatives IA', 'Insights IA', 'Chat IA'],
      cosmetic: ['INCI Analysis', 'Endocrine Disruptors', 'Allergens', 'Benefit Evaluation'],
      detergent: ['REACH Analysis', 'Ecotoxicity', 'Biodegradability', 'EU Ecolabel'] // ✨ NEW
    },
    endpoints: [
      'POST /analyze/food',
      'POST /analyze/cosmetic',
      'POST /analyze/cosmetic/dev',
      'GET /analyze/cosmetic/docs',
      'POST /analyze/detergent', // ✨ NEW
      'POST /analyze/detergent/dev', // ✨ NEW
      'GET /analyze/detergent/docs' // ✨ NEW
    ],
    status: 'operational',
    coverage: 'Alimentaire + Cosmétique + Détergent = Solution complète ECOLOJIA' // ✨ NEW
  });
});

// ===== FONCTIONS HELPER =====

/**
 * Génère des alternatives cosmétiques basiques (fallback)
 */
async function generateCosmeticAlternatives(productData, analysisResult) {
  const alternatives = [];
  
  // Alternatives basées sur les problèmes détectés
  if (analysisResult.risk_analysis?.endocrine_disruptors?.length > 0) {
    alternatives.push({
      type: 'Marque clean beauty',
      reason: 'Sans perturbateurs endocriniens',
      examples: ['Weleda', 'Dr. Hauschka', 'Melvita'],
      benefit: 'Réduction risque hormonal'
    });
  }

  if (analysisResult.allergen_analysis?.total_allergens > 2) {
    alternatives.push({
      type: 'Formule hypoallergénique',
      reason: 'Moins d\'allergènes détectés',
      examples: ['Avène', 'La Roche-Posay', 'Eucerin'],
      benefit: 'Meilleure tolérance cutanée'
    });
  }

  if (analysisResult.breakdown?.formulation?.details?.natural_ratio < 30) {
    alternatives.push({
      type: 'Cosmétiques bio/naturels',
      reason: 'Plus d\'ingrédients naturels',
      examples: ['Cattier', 'Logona', 'Lavera'],
      benefit: 'Formulation plus respectueuse'
    });
  }

  // Alternative DIY si pertinent
  const productType = detectProductType(productData);
  if (productType === 'soin' || productType === 'nettoyant') {
    alternatives.push({
      type: 'Recette maison',
      reason: 'Contrôle total des ingrédients',
      examples: ['Huile de jojoba + aloe vera', 'Savon de Marseille pur'],
      benefit: 'Économique et personnalisable'
    });
  }

  return alternatives;
}

/**
 * Génère des insights éducatifs cosmétiques basiques (fallback)
 */
function generateCosmeticInsights(analysisResult) {
  const insights = [];
  
  if (analysisResult.risk_analysis?.endocrine_disruptors?.length > 0) {
    insights.push("💡 Perturbateurs endocriniens : Ce produit contient des ingrédients pouvant affecter le système hormonal (Source : ANSM 2024)");
  }
  
  if (analysisResult.allergen_analysis?.total_allergens > 2) {
    insights.push("💡 Allergènes multiples : Risque de réaction cutanée élevé, test préalable recommandé (Source : REVIDAL 2024)");
  }
  
  if (analysisResult.benefit_analysis?.active_ingredients?.length > 0) {
    insights.push("💡 Ingrédients actifs : Présence de composés à efficacité démontrée scientifiquement (Source : SCCS 2024)");
  }
  
  if (insights.length === 0) {
    insights.push("💡 Formulation standard : Composition classique sans particularités notables (Source : Base INCI)");
  }
  
  return insights.slice(0, 3); // Maximum 3 insights
}

/**
 * Détection du type de produit cosmétique
 */
function detectProductType(productData) {
  const name = (productData.name || '').toLowerCase();
  const category = (productData.category || '').toLowerCase();
  
  if (name.includes('crème') || name.includes('lait') || category.includes('soin')) {
    return 'soin';
  } else if (name.includes('shampoo') || name.includes('gel') || category.includes('nettoyant')) {
    return 'nettoyant';
  } else if (name.includes('maquillage') || category.includes('makeup')) {
    return 'maquillage';
  } else {
    return 'autre';
  }
}

module.exports = router;
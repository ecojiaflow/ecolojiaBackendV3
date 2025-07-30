// backend/src/routes/analysis.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * POST /api/analysis/deepseek
 * Analyse un produit avec DeepSeek AI
 */
router.post('/deepseek', async (req, res) => {
  try {
    const { productName, ingredients, question } = req.body;

    if (!productName || !ingredients) {
      return res.status(400).json({
        success: false,
        error: 'productName et ingredients sont requis'
      });
    }

    // Préparer le prompt pour DeepSeek
    const systemPrompt = `Tu es un expert en nutrition et santé alimentaire. 
Tu analyses les produits selon la classification NOVA et fournis des conseils personnalisés.
Réponds de manière concise et structurée.`;

    const userPrompt = question || `Analyse nutritionnelle du produit "${productName}" avec les ingrédients: ${ingredients}. 
Fournis:
1. Classification NOVA (1-4)
2. Score santé (0-100)
3. Points positifs et négatifs
4. Recommandations`;

    // Appel à DeepSeek
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const analysis = response.data.choices[0].message.content;

    // Parser la réponse pour extraire les scores
    let novaScore = 4;
    let healthScore = 0;

    // Extraction basique des scores
    const novaMatch = analysis.match(/NOVA[:\s]*(\d)/i);
    if (novaMatch) {
      novaScore = parseInt(novaMatch[1]);
    }

    const healthMatch = analysis.match(/score[:\s]*(\d+)/i);
    if (healthMatch) {
      healthScore = parseInt(healthMatch[1]);
    }

    res.json({
      success: true,
      data: {
        productName,
        analysis,
        scores: {
          nova: novaScore,
          health: healthScore
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('[DeepSeek] Error:', error.response?.data || error.message);
    
    // Si DeepSeek échoue, fallback sur une analyse basique
    if (error.response?.status === 401) {
      return res.status(500).json({
        success: false,
        error: 'Configuration API DeepSeek incorrecte'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse',
      message: error.message
    });
  }
});

/**
 * GET /api/analysis/health
 * Check si le service d'analyse est disponible
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'analysis',
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    timestamp: new Date()
  });
});

module.exports = router;
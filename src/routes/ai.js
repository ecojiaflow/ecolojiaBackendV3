// ═══════════════════════════════════════════════════════════════════════
// 2. backend/src/routes/ai.js
// ═══════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Middleware simple d'authentification
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Non authentifié' });
    }
    // TODO: Vérifier le token avec JWT
    req.userId = 'user-id-from-token';
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Token invalide' });
  }
};

// POST /api/ai/analyze
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { productName, category, ingredients } = req.body;

    if (!productName || !category) {
      return res.status(400).json({
        success: false,
        error: 'Nom du produit et catégorie requis'
      });
    }

    console.log('[AI] Analyse demandée:', productName, category);

    // Appel à DeepSeek
    const systemPrompt = `Tu es un expert en nutrition et santé. 
Analyse les produits selon leur catégorie: food (NOVA), cosmetics (INCI), detergents (ECO).
Fournis des scores et recommandations concises.`;

    const userPrompt = `Analyse le produit "${productName}" (catégorie: ${category})
Ingrédients: ${ingredients || 'Non spécifiés'}
Fournis: score santé (0-100), points positifs/négatifs, recommandations`;

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const analysis = response.data.choices[0].message.content;

    res.json({
      success: true,
      data: {
        productName,
        category,
        analysis,
        scores: {
          health: 75, // À parser depuis l'analyse
          environment: 60,
          ethics: 80
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('[AI] Erreur analyse:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse IA'
    });
  }
});

// POST /api/ai/chat
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message requis'
      });
    }

    console.log('[AI] Chat message:', message.substring(0, 50) + '...');

    const systemPrompt = `Tu es l'assistant ECOLOJIA, expert en nutrition et produits sains.
Tu réponds de manière claire, bienveillante et scientifique.
${context ? `Contexte: ${JSON.stringify(context)}` : ''}`;

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.8,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;

    res.json({
      success: true,
      data: {
        message: reply,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('[AI] Erreur chat:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la conversation'
    });
  }
});

// GET /api/ai/health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ai',
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    timestamp: new Date()
  });
});

module.exports = router;
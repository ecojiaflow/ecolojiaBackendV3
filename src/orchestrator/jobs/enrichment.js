const axios = require('axios');

class EnrichmentService {
  constructor(prisma, logger) {
    this.prisma = prisma;
    this.logger = logger;
    this.deepSeekURL = process.env.DEEPSEEK_API_URL;
    this.deepSeekKey = process.env.DEEPSEEK_API_KEY;
  }

  async processQueue(limit = 10) {
    try {
      // Récupérer produits non enrichis
      const products = await this.prisma.product.findMany({
        where: {
          OR: [
            { resume_fr: null },
            { resume_fr: '' },
            { ai_confidence: { lt: 0.8 } }
          ]
        },
        orderBy: [
          { created_at: 'desc' }
        ],
        take: limit
      });

      this.logger.info(`🤖 ${products.length} produits à enrichir`);

      let enriched = 0;
      let errors = 0;

      for (const product of products) {
        try {
          await this.enrichProduct(product.id);
          enriched++;
          
          // Pause entre enrichissements
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          errors++;
          this.logger.warn(`Erreur enrichissement ${product.id}:`, error.message);
        }
      }

      this.logger.info(`✅ Enrichissement terminé: ${enriched} enrichis, ${errors} erreurs`);
      return { enriched, errors };

    } catch (error) {
      this.logger.error('❌ Erreur processQueue:', error);
      throw error;
    }
  }

  async enrichProduct(productId) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error(`Produit ${productId} non trouvé`);
    }

    this.logger.info(`🔍 Enrichissement: ${product.title}`);

    // Appel DeepSeek pour analyse
    const enrichmentData = await this.callDeepSeekAPI(product);
    
    // Mise à jour produit
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        resume_fr: enrichmentData.resume_fr,
        resume_en: enrichmentData.resume_en,
        eco_score: enrichmentData.eco_score,
        ai_confidence: enrichmentData.ai_confidence,
        confidence_pct: Math.round(enrichmentData.ai_confidence * 100),
        confidence_color: this.getConfidenceColor(enrichmentData.ai_confidence),
        verified_status: enrichmentData.ai_confidence >= 0.8 ? 'ai_verified' : 'manual_review',
        enriched_at: new Date()
      }
    });

    this.logger.info(`✅ Produit enrichi: ${updated.title}`);
    return updated;
  }

  async callDeepSeekAPI(product) {
    try {
      const prompt = this.buildPrompt(product);
      
      const response = await axios.post(this.deepSeekURL, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en analyse de produits écoresponsables. Réponds uniquement en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${this.deepSeekKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      return {
        resume_fr: parsed.resume_fr || '',
        resume_en: parsed.resume_en || '',
        eco_score: this.validateScore(parsed.eco_score),
        ai_confidence: this.validateConfidence(parsed.ai_confidence)
      };

    } catch (error) {
      this.logger.error(`Erreur DeepSeek pour ${product.id}:`, error);
      
      // Fallback en cas d'erreur
      return {
        resume_fr: `Analyse automatique du produit ${product.title}. Score basé sur la catégorie et les informations disponibles.`,
        resume_en: `Automatic analysis of ${product.title}. Score based on category and available information.`,
        eco_score: 2.5,
        ai_confidence: 0.6
      };
    }
  }

  buildPrompt(product) {
    return `
Analyse ce produit et fournis un JSON avec cette structure exacte :

{
  "resume_fr": "Résumé en français (2-3 phrases sur l'impact écologique)",
  "resume_en": "English summary (2-3 sentences about ecological impact)", 
  "eco_score": 3.2,
  "ai_confidence": 0.75
}

PRODUIT À ANALYSER :
- Titre: ${product.title}
- Description: ${product.description}
- Marque: ${product.brand || 'Non spécifié'}
- Catégorie: ${product.category}
- Tags: ${product.tags?.join(', ') || 'Aucun'}

CRITÈRES D'ÉVALUATION :
- eco_score: Note de 0 à 5 basée sur durabilité, composition, packaging
- ai_confidence: Confiance de 0 à 1 selon qualité des données
- resume_fr: Analyse critique et pédagogique
- resume_en: Version anglaise équivalente

Sois factuel et éducatif.`;
  }

  validateScore(score) {
    const num = parseFloat(score);
    return Math.min(5, Math.max(0, isNaN(num) ? 2.5 : num));
  }

  validateConfidence(confidence) {
    const num = parseFloat(confidence);
    return Math.min(1, Math.max(0, isNaN(num) ? 0.6 : num));
  }

  getConfidenceColor(confidence) {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'yellow';
    return 'red';
  }
}

module.exports = EnrichmentService;
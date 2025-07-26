// backend/src/services/ai/deepseekEnhanced.ts

/**
 * 🤖 ECOLOJIA - Service DeepSeek Enhanced
 * IA conversationnelle et analyse approfondie avec sources scientifiques
 */

import axios, { AxiosResponse } from 'axios';
import { UserProfile } from '../../types/scientific-analysis.types';

// Types spécifiques DeepSeek
interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface EnhancementInput {
  productName: string;
  ingredients: string[];
  novaGroup: number;
  additives: string[];
  userQuery?: string;
}

interface ConversationalInput {
  userMessage: string;
  productContext?: any;
  userProfile?: UserProfile;
  conversationHistory?: DeepSeekMessage[];
}

interface EnhancedInsight {
  type: 'risk' | 'alternative' | 'scientific' | 'general';
  content: string;
  priority: 'high' | 'medium' | 'info';
}

interface ConversationalResponse {
  message: string;
  confidence: number;
  sources: string[];
  suggestedQuestions?: string[];
}

export class DeepSeekEnhanced {
  private apiUrl: string;
  private apiKey: string;
  private maxTokens: number = 1000;
  private temperature: number = 0.3; // Plus factuel que créatif

  constructor() {
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ DeepSeek API key manquante - fonctionnalités IA limitées');
    }
  }

  /**
   * 🔬 ANALYSE ENRICHIE POUR CAS COMPLEXES
   * Utilisée quand l'analyse standard ne suffit pas
   */
  async enhanceAnalysis(input: EnhancementInput): Promise<{
    enhancedInsights: EnhancedInsight[];
    confidence: number;
    reasoning: string;
  }> {
    if (!this.apiKey) {
      return this.getFallbackEnhancement(input);
    }

    try {
      const systemPrompt = this.buildEnhancementSystemPrompt(input);
      const userPrompt = input.userQuery || this.generateDefaultAnalysisQuery(input);

      console.log('🤖 DeepSeek analyse enrichie pour:', input.productName);

      const response = await this.callDeepSeekAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const enhancedInsights = this.parseEnhancementResponse(response);

      return {
        enhancedInsights,
        confidence: 0.9,
        reasoning: "Analyse enrichie par IA avec sources scientifiques validées"
      };

    } catch (error) {
      console.error('❌ Erreur DeepSeek Enhancement:', error);
      return this.getFallbackEnhancement(input);
    }
  }

  /**
   * 💬 GÉNÉRATION RÉPONSE CONVERSATIONNELLE
   * Pour le chat IA avec contexte produit
   */
  async generateConversationalResponse(input: ConversationalInput): Promise<ConversationalResponse> {
    if (!this.apiKey) {
      return this.getFallbackConversationalResponse(input);
    }

    try {
      const messages = this.buildConversationalMessages(input);

      console.log('💬 DeepSeek chat pour question:', input.userMessage.substring(0, 50) + '...');

      const response = await this.callDeepSeekAPI(messages);
      const sources = this.extractSources(response);

      return {
        message: response,
        confidence: 0.85,
        sources,
        suggestedQuestions: this.generateSuggestedQuestions(input)
      };

    } catch (error) {
      console.error('❌ Erreur DeepSeek Chat:', error);
      return this.getFallbackConversationalResponse(input);
    }
  }

  /**
   * 🔧 CONSTRUCTION PROMPT SYSTÈME POUR ANALYSE
   */
  private buildEnhancementSystemPrompt(input: EnhancementInput): string {
    return `Tu es l'assistant IA scientifique d'ECOLOJIA, expert en nutrition et sécurité alimentaire.

PRODUIT À ANALYSER:
- Nom: ${input.productName}
- Ingrédients: ${input.ingredients?.join(', ') || 'Non spécifiés'}
- Classification NOVA: Groupe ${input.novaGroup}
- Additifs détectés: ${input.additives?.join(', ') || 'Aucun'}

EXPERTISE REQUISE:
Tu maîtrises parfaitement :
- Classification NOVA officielle (INSERM 2024)
- Base additifs EFSA avec évaluations récentes
- Études épidémiologiques nutrition (BMJ, Nature, Lancet 2024)
- Mécanismes physiologiques (microbiote, inflammation, métabolisme)
- Alternatives naturelles avec preuves d'efficacité

STYLE RÉPONSE:
- Factuel et scientifique mais accessible
- TOUJOURS citer sources officielles (ANSES, EFSA, études peer-reviewed)
- Expliquer mécanismes d'action quand pertinent
- Proposer alternatives concrètes avec preuves
- Nuancer selon niveau de preuve scientifique

INTERDICTIONS ABSOLUES:
- Jamais critiquer marques directement
- Jamais donner conseils médicaux personnalisés
- Jamais affirmer sans source scientifique
- Jamais utiliser termes alarmistes non justifiés

MISSION: Fournir analyse approfondie basée exclusivement sur science validée.`;
  }

  /**
   * 💬 CONSTRUCTION MESSAGES CONVERSATIONNELS
   */
  private buildConversationalMessages(input: ConversationalInput): DeepSeekMessage[] {
    const messages: DeepSeekMessage[] = [];

    // Prompt système contextuel
    let systemContent = `Tu es l'assistant IA scientifique d'ECOLOJIA.

STYLE CONVERSATIONNEL:
- Bienveillant et pédagogique
- Scientifique mais accessible à tous
- Toujours proposer solutions concrètes
- Encourager apprentissage progressif

SOURCES PRIVILÉGIÉES:
- ANSES, EFSA, INSERM pour références officielles
- Études récentes BMJ, Nature, Cell, Lancet 2024
- Classification NOVA pour transformation alimentaire
- Recherches microbiote intestinal

RÉPONSES LIMITÉES:
- Maximum 3 paragraphes courts
- 1 conseil actionnable systématique
- Citer 1-2 sources quand pertinent`;

    // Ajout contexte produit si disponible
    if (input.productContext?.scientificAnalysis) {
      const { nova, additives } = input.productContext.scientificAnalysis;
      systemContent += `

CONTEXTE PRODUIT ANALYSÉ:
- Classification NOVA: Groupe ${nova?.novaGroup} (${nova?.groupInfo?.name})
- Additifs analysés: ${additives?.total || 0} détectés
- Niveau risque additifs: ${additives?.overallRisk || 'inconnu'}
- Perturbateurs microbiote: ${additives?.microbiomeDisruptors?.length || 0}`;
    }

    // Ajout profil utilisateur si disponible
    if (input.userProfile?.healthGoals) {
      systemContent += `

PROFIL UTILISATEUR:
- Objectifs santé: ${input.userProfile.healthGoals.join(', ')}`;
      
      if (input.userProfile.allergies?.length) {
        systemContent += `
- Allergies: ${input.userProfile.allergies.join(', ')}`;
      }
    }

    messages.push({ role: 'system', content: systemContent });

    // Historique conversation si disponible
    if (input.conversationHistory?.length) {
      messages.push(...input.conversationHistory.slice(-6)); // Derniers 6 messages
    }

    // Message utilisateur actuel
    messages.push({ role: 'user', content: input.userMessage });

    return messages;
  }

  /**
   * 🌐 APPEL API DEEPSEEK
   */
  private async callDeepSeekAPI(messages: DeepSeekMessage[]): Promise<string> {
    const response: AxiosResponse<DeepSeekResponse> = await axios.post(
      this.apiUrl,
      {
        model: 'deepseek-chat',
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 secondes timeout
      }
    );

    if (!response.data.choices?.[0]?.message?.content) {
      throw new Error('Réponse DeepSeek invalide');
    }

    // Log usage pour monitoring coûts
    if (response.data.usage) {
      console.log('📊 DeepSeek usage:', {
        tokens: response.data.usage.total_tokens,
        cost_estimate: response.data.usage.total_tokens * 0.00002 // ~$0.02/1k tokens
      });
    }

    return response.data.choices[0].message.content;
  }

  /**
   * 🔍 PARSING RÉPONSE ANALYSE ENRICHIE
   */
  private parseEnhancementResponse(response: string): EnhancedInsight[] {
    const insights: EnhancedInsight[] = [];
    const lines = response.split('\n').filter(line => line.trim().length > 0);

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Détection insights par patterns
      if (this.containsRiskKeywords(trimmedLine)) {
        insights.push({
          type: 'risk',
          content: trimmedLine,
          priority: 'high'
        });
      } else if (this.containsAlternativeKeywords(trimmedLine)) {
        insights.push({
          type: 'alternative',
          content: trimmedLine,
          priority: 'medium'
        });
      } else if (this.containsScientificKeywords(trimmedLine)) {
        insights.push({
          type: 'scientific',
          content: trimmedLine,
          priority: 'info'
        });
      } else if (trimmedLine.length > 20) { // Éviter lignes trop courtes
        insights.push({
          type: 'general',
          content: trimmedLine,
          priority: 'medium'
        });
      }
    });

    // Limiter à 5 insights max pour éviter surcharge
    return insights.slice(0, 5);
  }

  /**
   * 📚 EXTRACTION SOURCES SCIENTIFIQUES
   */
  private extractSources(response: string): string[] {
    const sources = new Set<string>();
    
    // Patterns pour détecter sources
    const sourcePatterns = [
      /ANSES[\s\d]*/gi,
      /EFSA[\s\d]*/gi,
      /INSERM[\s\d]*/gi,
      /BMJ[\s\d]*/gi,
      /Nature[\s\d]*/gi,
      /Lancet[\s\d]*/gi,
      /Cell[\s\d]*/gi,
      /Diabetes Care[\s\d]*/gi,
      /Environmental Health[\s\d]*/gi
    ];

    sourcePatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        matches.forEach(match => sources.add(match.trim()));
      }
    });

    return Array.from(sources).slice(0, 4); // Max 4 sources
  }

  /**
   * 💡 GÉNÉRATION QUESTIONS SUGGÉRÉES
   */
  private generateSuggestedQuestions(input: ConversationalInput): string[] {
    const questions = [];

    // Questions basées sur contexte produit
    if (input.productContext?.scientificAnalysis?.nova?.novaGroup === 4) {
      questions.push("Pourquoi l'ultra-transformation est-elle problématique ?");
      questions.push("Quelles sont les alternatives les plus faciles à adopter ?");
    }

    if (input.productContext?.scientificAnalysis?.additives?.microbiomeDisruptors?.length > 0) {
      questions.push("Comment ces additifs affectent-ils mon microbiote intestinal ?");
      questions.push("Combien de temps faut-il pour réparer son microbiote ?");
    }

    // Questions générales utiles
    questions.push("Comment décoder efficacement les étiquettes alimentaires ?");
    questions.push("Quelles études récentes confirment ces effets sur la santé ?");

    return questions.slice(0, 4); // Max 4 questions
  }

  /**
   * 🆘 FALLBACKS EN CAS D'ERREUR API
   */
  private getFallbackEnhancement(input: EnhancementInput) {
    const insights: EnhancedInsight[] = [];

    if (input.novaGroup === 4) {
      insights.push({
        type: 'risk',
        content: 'Produit ultra-transformé détecté. Les études montrent des risques cardiovasculaires et métaboliques accrus.',
        priority: 'high'
      });
    }

    if (input.additives.length > 3) {
      insights.push({
        type: 'risk',
        content: 'Nombreux additifs détectés. Privilégier produits avec moins de 5 ingrédients reconnaissables.',
        priority: 'medium'
      });
    }

    insights.push({
      type: 'alternative',
      content: 'Alternative recommandée : version faite maison avec ingrédients simples et naturels.',
      priority: 'medium'
    });

    return {
      enhancedInsights: insights,
      confidence: 0.5,
      reasoning: "Analyse de base - API IA temporairement indisponible"
    };
  }

  private getFallbackConversationalResponse(input: ConversationalInput): ConversationalResponse {
    return {
      message: "Je rencontre une difficulté technique temporaire. Peux-tu reformuler ta question ? En attendant, je peux te dire que je privilégie toujours les produits les moins transformés et avec le moins d'additifs possible.",
      confidence: 0.1,
      sources: ['Principes nutrition générale'],
      suggestedQuestions: [
        "Comment choisir des produits plus naturels ?",
        "Quels sont les additifs à éviter en priorité ?",
        "Comment cuisiner plus facilement à la maison ?"
      ]
    };
  }

  private generateDefaultAnalysisQuery(input: EnhancementInput): string {
    return `Analyse approfondie de ce produit alimentaire :

Risques potentiels pour la santé humaine ?
Mécanismes d'action physiologiques ?
Alternatives naturelles scientifiquement validées ?
Conseils transition progressive ?

Focus sur données factuelles avec sources récentes.`;
  }

  /**
   * 🔍 UTILITAIRES DÉTECTION MOTS-CLÉS
   */
  private containsRiskKeywords(text: string): boolean {
    const riskKeywords = [
      'risque', 'danger', 'problématique', 'nocif', 'inflammation', 
      'perturbation', 'toxique', 'cancérigène', 'éviter'
    ];
    return riskKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private containsAlternativeKeywords(text: string): boolean {
    const altKeywords = [
      'alternative', 'remplacer', 'substitut', 'plutôt', 'préférer',
      'naturel', 'bio', 'maison', 'traditioanel', 'artisanal'
    ];
    return altKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private containsScientificKeywords(text: string): boolean {
    const sciKeywords = [
      'étude', 'recherche', 'selon', 'mécanisme', 'analyse',
      'BMJ', 'Nature', 'Lancet', 'ANSES', 'EFSA', 'INSERM'
    ];
    return sciKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * 📊 MÉTHODES MONITORING & DEBUG
   */
  getApiStatus(): { available: boolean; configured: boolean } {
    return {
      available: Boolean(this.apiKey),
      configured: Boolean(this.apiUrl && this.apiKey)
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      await this.callDeepSeekAPI([
        { role: 'user', content: 'Test de connexion - réponds juste "OK"' }
      ]);
      return true;
    } catch (error) {
      console.error('❌ Test connexion DeepSeek échoué:', error);
      return false;
    }
  }
}

export default DeepSeekEnhanced;
// PATH: backend/src/services/ai/conversationalAI.ts
/* -------------------------------------------------------------------------- */
/*                       ConversationalAI – Version stable                    */
/* -------------------------------------------------------------------------- */

import { v4 as uuid } from 'uuid';
import dotenv from 'dotenv';
import AlternativesEngine from './alternativesEngine';
import InsightsGenerator from './insightsGenerator';

dotenv.config();

/* --------------------------------- Types ---------------------------------- */

export interface ProductContext {
  name?: string;
  score?: number;
  grade?: string;
  issues?: string[];
  ingredients?: string;
  breakdown?: any;
}

export interface UserProfile {
  preferences?: string[];
  dietary_restrictions?: string[];
  health_goals?: string[];
  experience_level?: string;
}

export interface AIResponse {
  message: string;
  confidence: number;
  response_type: 'answer' | 'follow_up' | 'error';
  sources?: string[];
  alternatives_mentioned?: string[];
  follow_up_questions?: string[];
}

/* ------------------------------ Main Classe ------------------------------- */

export default class ConversationalAI {
  /* --------- Propriétés déclarées (corrige les erreurs TS2339) ----------- */
  private deepseekApiKey: string;
  private deepseekEndpoint: string;
  private conversationHistory: Map<string, { role: 'user' | 'ai'; content: string }[]> =
    new Map();
  private maxHistoryLength = 20; // Limite de mémoire par session

  /* -------------------- Dépendances internes (IA locale) ------------------ */
  private alternativesEngine = new AlternativesEngine();
  private insightsGenerator = new InsightsGenerator();

  /* -------------------------------- Ctor --------------------------------- */
  constructor() {
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
    this.deepseekEndpoint =
      process.env.DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';

    if (!this.deepseekApiKey) {
      console.warn(
        '⚠️  DEEPSEEK_API_KEY manquant – le service utilisera des réponses mock.'
      );
    }
  }

  /* ------------------------ Historique de conversation -------------------- */
  private getConversationHistory(sessionId: string) {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    return this.conversationHistory.get(sessionId)!;
  }

  private addMessage(
    sessionId: string,
    role: 'user' | 'ai',
    content: string
  ): void {
    const history = this.getConversationHistory(sessionId);
    history.push({ role, content });
    /* Garder la mémoire sous la limite */
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                MÉTHODE PRINCIPALE – question utilisateur                 */
  /* ------------------------------------------------------------------------ */
  async processUserQuestion(
    message: string,
    product_context: ProductContext = {},
    user_profile: UserProfile = {},
    session_id: string = this.generateSessionId()
  ): Promise<AIResponse> {
    /* 1. Memoriser question utilisateur */
    this.addMessage(session_id, 'user', message);

    /* 2. Générer réponse – deux modes : DeepSeek API OU fallback mock */
    let aiMessage = '';
    let confidence = 0.5;
    let responseType: AIResponse['response_type'] = 'answer';

    if (this.deepseekApiKey) {
      try {
        const payload = {
          model: 'gpt-3.5-turbo',
          messages: this.getConversationHistory(session_id).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: 0.7,
          max_tokens: 512,
        };

        const res = await fetch(this.deepseekEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.deepseekApiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        aiMessage = data.choices?.[0]?.message?.content?.trim() || 'Réponse indisponible';
        confidence = data.choices?.[0]?.finish_reason === 'stop' ? 0.9 : 0.6;
      } catch (err) {
        console.error('DeepSeek API error → fallback', err);
        aiMessage = this.generateMockAnswer(message, product_context);
        responseType = 'error';
      }
    } else {
      aiMessage = this.generateMockAnswer(message, product_context);
      responseType = 'answer';
    }

    /* 3. Memoriser réponse IA */
    this.addMessage(session_id, 'ai', aiMessage);

    /* 4. Construire réponse structurée */
    return {
      message: aiMessage,
      confidence,
      response_type: responseType,
      sources: [], // TODO : ajouter sources réelles
      alternatives_mentioned: this.alternativesEngine
        .extractAlternatives(aiMessage)
        .slice(0, 3),
      follow_up_questions: this.suggestFollowUps(aiMessage),
    };
  }

  /* -------------------------- Méthodes utilitaires ------------------------ */

  clearConversationHistory(sessionId: string) {
    this.conversationHistory.delete(sessionId);
  }

  cleanup() {
    /* Supprime les vieilles sessions (24 h) – simplifié */
    const DAY = 86_400_000;
    const now = Date.now();
    for (const [id, history] of this.conversationHistory.entries()) {
      const last = history[history.length - 1];
      if (last && now - new Date(last.content).getTime() > DAY) {
        this.conversationHistory.delete(id);
      }
    }
  }

  /* ---------------------------- Réponses mock ----------------------------- */

  private generateMockAnswer(message: string, product: ProductContext): string {
    /* Réponse simple basée sur le score si présent */
    if (product && typeof product.score === 'number') {
      if (product.score < 40) {
        return `Ce produit présente un score faible (${product.score}/100). Il est préférable d’opter pour une alternative moins transformée et plus riche en fibres.`;
      } else {
        return `Avec un score de ${product.score}/100, ce produit est correct, mais il existe sans doute de meilleures options plus naturelles.`;
      }
    }
    return `Je n'ai pas assez d'informations sur ce produit. Pouvez-vous préciser vos attentes ?`;
  }

  private suggestFollowUps(answer: string): string[] {
    const generic = [
      'Souhaitez-vous des alternatives plus saines ?',
      'Voulez-vous comprendre comment nous calculons le score ?',
      'Aimeriez-vous connaître l’impact environnemental de ce produit ?',
    ];
    return generic.slice(0, 2);
  }

  private generateSessionId() {
    return `chat_${uuid()}`;
  }
}
// EOF

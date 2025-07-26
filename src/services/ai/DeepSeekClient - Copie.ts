// PATH: backend/src/services/ai/DeepSeekClient.ts
/*  Dépendances : axios, crypto
    Utilise cacheManager (Redis) et Logger déjà présents                  */
import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';

import { Logger } from '../../utils/Logger';
import { cacheManager } from '../cache/CacheManager';

const logger = new Logger('DeepSeekClient');

// ──────────────────────────────────── Types ───────────────────────────────────
export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekAPIResponse {
  choices: Array<{ message: { role: string; content: string } }>;
  usage?: { total_tokens: number };
}

export interface AnalysisEnhancementRequest {
  productName: string;
  category: 'food' | 'cosmetics' | 'detergents';
  baseAnalysis: any;
  userQuery?: string;
  userProfile?: {
    allergies?: string[];
    healthGoals?: string[];
    preferences?: string[];
  };
}

// ────────────────────────────────── Client ───────────────────────────────────
export class DeepSeekClient {
  private readonly client: AxiosInstance;
  private readonly CACHE_PREFIX = 'deepseek:';
  private readonly CACHE_TTL = 3600;
  private readonly cfg: {
    apiKey: string;
    baseURL: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
  };

  constructor() {
    this.cfg = {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      temperature: 0.3,
      maxTokens: 2000,
      timeout: 30_000
    };

    if (!this.cfg.apiKey) {
      logger.warn('⚠️  Clé API DeepSeek non définie – fonctions IA désactivées.');
    }

    this.client = axios.create({
      baseURL: this.cfg.baseURL,
      timeout: this.cfg.timeout,
      headers: {
        Authorization: `Bearer ${this.cfg.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    this.client.interceptors.response.use(
      (r) => r,
      (e) => {
        logger.error('DeepSeek API error :', e.response?.data || e.message);
        return Promise.reject(e);
      }
    );
  }

  // ─────────── API publiques ───────────
  async enhanceProductAnalysis(req: AnalysisEnhancementRequest) {
    const cacheKey = this.key('enhance', req);
    const cached = await cacheManager.get(cacheKey);
    if (cached) return cached;

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: this.promptEnhanceSys(req.category) },
      { role: 'user', content: this.promptEnhanceUser(req) }
    ];
    const raw = await this.chat(messages);
    const parsed = this.parseEnhance(raw);
    await cacheManager.set(cacheKey, parsed, this.CACHE_TTL);
    return parsed;
  }

  async chatWithContext(prompt: string, ctx?: any, hist: DeepSeekMessage[] = []) {
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: this.promptChatSys(ctx) },
      ...hist.slice(-6),
      { role: 'user', content: prompt }
    ];
    const raw = await this.chat(messages);
    return {
      response: raw,
      confidence: 0.9,
      sources: this.extractSources(raw),
      suggestedQuestions: this.suggest(ctx),
      tokensUsed: raw.length / 4
    };
  }

  async generateAlternatives(product: any, category: string, criteria: string[]) {
    const cacheKey = this.key('alt', { product, criteria });
    const cached = await cacheManager.get(cacheKey);
    if (cached) return cached;

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: 'Tu es expert en consommation responsable.' },
      { role: 'user', content: this.promptAlt(product, category, criteria) }
    ];
    const raw = await this.chat(messages);
    const alt = this.parseAlt(raw);
    await cacheManager.set(cacheKey, alt, this.CACHE_TTL);
    return alt;
  }

  // ─────────── Low-level chat ───────────
  private async chat(msg: DeepSeekMessage[]): Promise<string> {
    if (!this.cfg.apiKey) throw new Error('DeepSeek API key absente.');

    try {
      const { data } = await this.client.post<DeepSeekAPIResponse>(
        '/chat/completions',
        {
          model: this.cfg.model,
          messages: msg,
          temperature: this.cfg.temperature,
          max_tokens: this.cfg.maxTokens,
          stream: false
        }
      );
      return data.choices[0]?.message?.content || '';
    } catch (e) {
      if (axios.isAxiosError(e)) throw this.handleAxios(e);
      throw e;
    }
  }

  // ─────────── Prompts ───────────
  private promptEnhanceSys(cat: string) {
    const base = {
      food: 'Tu es nutritionniste expert NOVA/EFSA.',
      cosmetics: 'Tu es dermatologue expert INCI.',
      detergents: 'Tu es chimiste environnemental expert REACH.'
    };
    return base[cat as keyof typeof base] ?? base.food;
  }

  private promptEnhanceUser(r: AnalysisEnhancementRequest) {
    return `
Produit : ${r.productName}
Analyse : ${JSON.stringify(r.baseAnalysis)}
${r.userQuery ? 'Question : ' + r.userQuery : ''}
${r.userProfile ? 'Profil : ' + JSON.stringify(r.userProfile) : ''}
Enrichis l’analyse (insights, recommandations, alternatives, sources).`.trim();
  }

  private promptChatSys(ctx?: any) {
    return `
Assistant scientifique ECOLOJIA.
Contexte : ${ctx ? JSON.stringify(ctx) : '—'} 
Réponses ≤3 paragraphes, citer sources, action concrète.`.trim();
  }

  private promptAlt(p: any, cat: string, crit: string[]) {
    return `
Alternatives saines pour : ${p.name}
Catégorie : ${cat}
Critères : ${crit.join(', ') || '—'}
Format JSON.`.trim();
  }

  // ─────────── Parsing ───────────
  private parseEnhance(txt: string) {
    try {
      const m = txt.match(/\{[\s\S]*}/);
      return m ? JSON.parse(m[0]) : { insights: [], recommendations: [] };
    } catch {
      return { insights: [], recommendations: [] };
    }
  }

  private parseAlt(txt: string) {
    try {
      const m = txt.match(/\[[\s\S]*]/);
      return m ? JSON.parse(m[0]) : [];
    } catch {
      return [];
    }
  }

  private extractSources(t: string) {
    return [...new Set((t.match(/INSERM|ANSES|EFSA|Nature|Lancet/gi) ?? []))];
  }

  private suggest(ctx?: any) {
    const q = ['Réduire les additifs', 'Alternatives maison'];
    if (ctx?.novaGroup >= 4) q.unshift('Pourquoi ultra-transformé ?');
    return q;
  }

  private key(op: string, data: any) {
    const h = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return `${this.CACHE_PREFIX}${op}:${h}`;
  }

  private handleAxios(e: AxiosError) {
    if (e.response?.status === 401) return new Error('Clé DeepSeek invalide');
    if (e.response?.status === 429) return new Error('Quota DeepSeek atteint');
    return new Error(e.message);
  }
}

// singleton
export const deepSeekClient = new DeepSeekClient();
// EOF

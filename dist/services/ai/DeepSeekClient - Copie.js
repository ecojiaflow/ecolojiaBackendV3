"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepSeekClient = exports.DeepSeekClient = void 0;
// PATH: backend/src/services/ai/DeepSeekClient.ts
/*  Dépendances : axios, crypto
    Utilise cacheManager (Redis) et Logger déjà présents                  */
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const Logger_1 = require("../../utils/Logger");
const CacheManager_1 = require("../cache/CacheManager");
const logger = new Logger_1.Logger('DeepSeekClient');
// ────────────────────────────────── Client ───────────────────────────────────
class DeepSeekClient {
    constructor() {
        this.CACHE_PREFIX = 'deepseek:';
        this.CACHE_TTL = 3600;
        this.cfg = {
            apiKey: process.env.DEEPSEEK_API_KEY || '',
            baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
            model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            temperature: 0.3,
            maxTokens: 2000,
            timeout: 30000
        };
        if (!this.cfg.apiKey) {
            logger.warn('⚠️  Clé API DeepSeek non définie – fonctions IA désactivées.');
        }
        this.client = axios_1.default.create({
            baseURL: this.cfg.baseURL,
            timeout: this.cfg.timeout,
            headers: {
                Authorization: `Bearer ${this.cfg.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        this.client.interceptors.response.use((r) => r, (e) => {
            logger.error('DeepSeek API error :', e.response?.data || e.message);
            return Promise.reject(e);
        });
    }
    // ─────────── API publiques ───────────
    async enhanceProductAnalysis(req) {
        const cacheKey = this.key('enhance', req);
        const cached = await CacheManager_1.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const messages = [
            { role: 'system', content: this.promptEnhanceSys(req.category) },
            { role: 'user', content: this.promptEnhanceUser(req) }
        ];
        const raw = await this.chat(messages);
        const parsed = this.parseEnhance(raw);
        await CacheManager_1.cacheManager.set(cacheKey, parsed, this.CACHE_TTL);
        return parsed;
    }
    async chatWithContext(prompt, ctx, hist = []) {
        const messages = [
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
    async generateAlternatives(product, category, criteria) {
        const cacheKey = this.key('alt', { product, criteria });
        const cached = await CacheManager_1.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const messages = [
            { role: 'system', content: 'Tu es expert en consommation responsable.' },
            { role: 'user', content: this.promptAlt(product, category, criteria) }
        ];
        const raw = await this.chat(messages);
        const alt = this.parseAlt(raw);
        await CacheManager_1.cacheManager.set(cacheKey, alt, this.CACHE_TTL);
        return alt;
    }
    // ─────────── Low-level chat ───────────
    async chat(msg) {
        if (!this.cfg.apiKey)
            throw new Error('DeepSeek API key absente.');
        try {
            const { data } = await this.client.post('/chat/completions', {
                model: this.cfg.model,
                messages: msg,
                temperature: this.cfg.temperature,
                max_tokens: this.cfg.maxTokens,
                stream: false
            });
            return data.choices[0]?.message?.content || '';
        }
        catch (e) {
            if (axios_1.default.isAxiosError(e))
                throw this.handleAxios(e);
            throw e;
        }
    }
    // ─────────── Prompts ───────────
    promptEnhanceSys(cat) {
        const base = {
            food: 'Tu es nutritionniste expert NOVA/EFSA.',
            cosmetics: 'Tu es dermatologue expert INCI.',
            detergents: 'Tu es chimiste environnemental expert REACH.'
        };
        return base[cat] ?? base.food;
    }
    promptEnhanceUser(r) {
        return `
Produit : ${r.productName}
Analyse : ${JSON.stringify(r.baseAnalysis)}
${r.userQuery ? 'Question : ' + r.userQuery : ''}
${r.userProfile ? 'Profil : ' + JSON.stringify(r.userProfile) : ''}
Enrichis l’analyse (insights, recommandations, alternatives, sources).`.trim();
    }
    promptChatSys(ctx) {
        return `
Assistant scientifique ECOLOJIA.
Contexte : ${ctx ? JSON.stringify(ctx) : '—'} 
Réponses ≤3 paragraphes, citer sources, action concrète.`.trim();
    }
    promptAlt(p, cat, crit) {
        return `
Alternatives saines pour : ${p.name}
Catégorie : ${cat}
Critères : ${crit.join(', ') || '—'}
Format JSON.`.trim();
    }
    // ─────────── Parsing ───────────
    parseEnhance(txt) {
        try {
            const m = txt.match(/\{[\s\S]*}/);
            return m ? JSON.parse(m[0]) : { insights: [], recommendations: [] };
        }
        catch {
            return { insights: [], recommendations: [] };
        }
    }
    parseAlt(txt) {
        try {
            const m = txt.match(/\[[\s\S]*]/);
            return m ? JSON.parse(m[0]) : [];
        }
        catch {
            return [];
        }
    }
    extractSources(t) {
        return [...new Set((t.match(/INSERM|ANSES|EFSA|Nature|Lancet/gi) ?? []))];
    }
    suggest(ctx) {
        const q = ['Réduire les additifs', 'Alternatives maison'];
        if (ctx?.novaGroup >= 4)
            q.unshift('Pourquoi ultra-transformé ?');
        return q;
    }
    key(op, data) {
        const h = crypto_1.default.createHash('sha256').update(JSON.stringify(data)).digest('hex');
        return `${this.CACHE_PREFIX}${op}:${h}`;
    }
    handleAxios(e) {
        if (e.response?.status === 401)
            return new Error('Clé DeepSeek invalide');
        if (e.response?.status === 429)
            return new Error('Quota DeepSeek atteint');
        return new Error(e.message);
    }
}
exports.DeepSeekClient = DeepSeekClient;
// singleton
exports.deepSeekClient = new DeepSeekClient();
// EOF

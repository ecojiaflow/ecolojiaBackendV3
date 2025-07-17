"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: src/services/ai/conversationalAI.ts
class ConversationalAI {
    constructor() {
        this.conversationHistory = [];
        this.maxHistoryLength = 10;
        this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
        this.deepseekEndpoint = process.env.DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/v1/chat';
        this.reset();
    }
    reset() {
        this.conversationHistory = [];
    }
    async chat(prompt) {
        const fullPrompt = [...this.conversationHistory, prompt].slice(-this.maxHistoryLength).join('\n');
        // Ligne 150 : on retourne une réponse simulée
        return `🤖 Réponse IA simulée à: "${prompt}"`;
    }
    getConversationHistory() {
        return this.conversationHistory;
    }
    addToHistory(message) {
        this.conversationHistory.push(message);
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory.shift();
        }
    }
}
exports.default = ConversationalAI;
// EOF

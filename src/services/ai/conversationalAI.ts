// PATH: src/services/ai/conversationalAI.ts
export default class ConversationalAI {
  private conversationHistory: string[] = [];
  private maxHistoryLength = 10;
  private deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
  private deepseekEndpoint = process.env.DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/v1/chat';

  constructor() {
    this.reset();
  }

  private reset() {
    this.conversationHistory = [];
  }

  public async chat(prompt: string): Promise<string> {
    const fullPrompt = [...this.conversationHistory, prompt].slice(-this.maxHistoryLength).join('\n');

    // Ligne 150 : on retourne une réponse simulée
    return `🤖 Réponse IA simulée à: "${prompt}"`;
  }

  public getConversationHistory(): string[] {
    return this.conversationHistory;
  }

  public addToHistory(message: string) {
    this.conversationHistory.push(message);
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }
}
// EOF

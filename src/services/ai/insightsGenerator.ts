// PATH: src/services/ai/insightsGenerator.ts
import fs from 'fs/promises';
import path from 'path';

type Insight = {
  type: string;
  message: string;
};

export default class InsightsGenerator {
  private insightsDB: Record<string, Insight[]> = {};

  constructor() {
    this.loadDatabase();
  }

  private async loadDatabase() {
    try {
      const filePath = path.join(__dirname, '../../data/educational-insights-db.json');
      const content = await fs.readFile(filePath, 'utf-8');
      this.insightsDB = JSON.parse(content);
      console.log('✅ Insights DB chargée:', Object.keys(this.insightsDB).length, 'entrées');
    } catch (err: any) {
      console.error('❌ Error loading insights database:', err.message);
      this.insightsDB = {}; // fallback vide
    }
  }

  public async generate(productCategory: string): Promise<Insight[]> {
    return this.insightsDB[productCategory] || [
      {
        type: 'info',
        message: 'Aucun insight éducatif trouvé pour cette catégorie.'
      }
    ];
  }

  public getAllCategories(): string[] {
    return Object.keys(this.insightsDB);
  }
}
// EOF

// PATH: backend/src/services/ai/insightsGenerator.ts
import fs from 'fs/promises';
import path from 'path';

export interface EducationalInsight {
  id: string;
  title: string;
  fact: string;
  explanation: string;
  impact: string;
  source: string;
  [key: string]: any;
}

export class InsightsGenerator {
  private insightsDB: Record<string, any> = {};

  constructor() {
    this.loadDatabase();
  }

  private async loadDatabase() {
    try {
      const dataPath = path.join(__dirname, '..', '..', 'data', 'educational-insights-db.json');
      const fileData = await fs.readFile(dataPath, 'utf-8');
      this.insightsDB = JSON.parse(fileData);
    } catch (err) {
      console.error('❌ Error loading insights database:', err);
    }
  }

  getAllTopics(): string[] {
    return Object.keys(this.insightsDB);
  }

  getTopicInsights(topic: string): EducationalInsight[] {
    const category = this.insightsDB[topic];
    if (!category || !category.facts) return [];
    return category.facts;
  }

  searchByKeyword(keyword: string): EducationalInsight[] {
    const results: EducationalInsight[] = [];
    for (const category of Object.values(this.insightsDB)) {
      if (category.facts) {
        for (const fact of category.facts) {
          if (fact.fact.toLowerCase().includes(keyword.toLowerCase())) {
            results.push(fact);
          }
        }
      }
    }
    return results;
  }

  getPersonalizedInsights(trigger: string): string[] {
    const triggers = this.insightsDB.personalization_triggers || {};
    return triggers[trigger]?.specific_insights || [];
  }

  getRandomFact(): EducationalInsight | null {
    const topics = Object.keys(this.insightsDB);
    const allFacts = topics.flatMap(topic => this.insightsDB[topic]?.facts || []);
    if (allFacts.length === 0) return null;
    const index = Math.floor(Math.random() * allFacts.length);
    return allFacts[index];
  }
}

export default InsightsGenerator;
// EOF

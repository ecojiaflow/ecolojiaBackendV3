// PATH: src/services/ai/educationalInsights.ts
type InsightTemplate = {
  goal: string;
  advice: string;
};

type Module = {
  title: string;
  description: string;
};

export default class EducationalInsightsEngine {
  private scientificDatabase: Record<string, string> = {};
  private educationalTemplates: InsightTemplate[] = [];
  private microLearningModules: Module[] = [];

  constructor() {
    this.buildScientificDatabase();
    this.buildEducationalTemplates();
    this.buildMicroLearningModules();
  }

  private buildScientificDatabase() {
    this.scientificDatabase = {
      'fibres': 'Améliore le transit intestinal, selon INSERM 2022.',
      'probiotiques': 'Renforce la flore intestinale – étude INRA 2021.',
      'sucre': 'Trop de sucres → perturbation métabolique – EFSA 2023.'
    };
  }

  private buildEducationalTemplates() {
    this.educationalTemplates = [
      {
        goal: 'digestion',
        advice: 'Privilégiez les aliments riches en fibres comme les légumes secs.'
      },
      {
        goal: 'immunité',
        advice: 'Consommez des probiotiques naturels (yaourt, kéfir).'
      }
    ];
  }

  private buildMicroLearningModules() {
    this.microLearningModules = [
      {
        title: 'Pourquoi les fibres ?',
        description: 'Elles nourrissent vos bonnes bactéries intestinales.'
      },
      {
        title: 'Les dangers du sucre',
        description: 'Un excès quotidien augmente le risque de diabète.'
      }
    ];
  }

  public generate({
    productName,
    ingredients,
    userGoals
  }: {
    productName: string;
    ingredients: string;
    userGoals: string[];
  }): {
    scientific: string[];
    advice: string[];
    modules: Module[];
  } {
    const scientific: string[] = [];
    const advice: string[] = [];

    for (const goal of userGoals) {
      const match = this.educationalTemplates.find((tpl) => tpl.goal === goal);
      if (match) advice.push(match.advice);
    }

    for (const ing of ingredients.toLowerCase().split(/[,\\s]+/)) {
      const sci = this.scientificDatabase[ing];
      if (sci) scientific.push(`${ing} → ${sci}`);
    }

    return {
      scientific,
      advice,
      modules: this.microLearningModules
    };
  }
}
// EOF

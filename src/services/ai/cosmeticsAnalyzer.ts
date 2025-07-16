// PATH: src/services/ai/cosmeticsAnalyzer.ts
type CosmeticIngredient = string;

export default class CosmeticsAnalyzer {
  private cosmeticsData: CosmeticIngredient[] = [];
  private allergens: string[] = [];
  private endocrineDisruptors: string[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.cosmeticsData = [
      'aqua',
      'glycerin',
      'alcohol',
      'parfum',
      'limonene',
      'linalool',
      'bht',
      'phenoxyethanol',
    ];

    this.allergens = ['limonene', 'linalool'];
    this.endocrineDisruptors = ['bht', 'phenoxyethanol'];
  }

  public analyze(ingredients: string[]): {
    safe: string[];
    allergens: string[];
    endocrine: string[];
  } {
    const safe: string[] = [];
    const allergens: string[] = [];
    const endocrine: string[] = [];

    for (const ing of ingredients) {
      const norm = ing.toLowerCase();

      if (this.endocrineDisruptors.includes(norm)) {
        endocrine.push(norm);
      } else if (this.allergens.includes(norm)) {
        allergens.push(norm);
      } else {
        safe.push(norm);
      }
    }

    return { safe, allergens, endocrine };
  }

  public getIngredientList(): string[] {
    return this.cosmeticsData;
  }

  public getAllergenList(): string[] {
    return this.allergens;
  }

  public getEndocrineList(): string[] {
    return this.endocrineDisruptors;
  }
}
// EOF

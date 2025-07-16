// PATH: src/services/ai/detergentsAnalyzer.ts
type DetergentIngredient = string;

export default class DetergentsAnalyzer {
  private detergentsData: DetergentIngredient[] = [];
  private dangerousVOCs: string[] = [];
  private ecoCertifications: string[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.detergentsData = [
      'sodium laureth sulfate',
      'ammonium quaternary compounds',
      'limonene',
      'ethanol',
      'benzisothiazolinone',
      'sodium carbonate'
    ];

    this.dangerousVOCs = [
      'limonene',
      'ethanol',
      'ammonium quaternary compounds'
    ];

    this.ecoCertifications = ['ecocert', 'european ecolabel', 'nature & progrès'];
  }

  public analyze(ingredients: string[]): {
    safe: string[];
    dangerous: string[];
    certifications: string[];
  } {
    const safe: string[] = [];
    const dangerous: string[] = [];

    for (const ing of ingredients) {
      const norm = ing.toLowerCase();

      if (this.dangerousVOCs.includes(norm)) {
        dangerous.push(norm);
      } else {
        safe.push(norm);
      }
    }

    return {
      safe,
      dangerous,
      certifications: this.ecoCertifications
    };
  }

  public checkEcoCertifications(description: string): string[] {
    const found: string[] = [];

    for (const cert of this.ecoCertifications) {
      if (description.toLowerCase().includes(cert)) {
        found.push(cert);
      }
    }

    return found;
  }
}
// EOF

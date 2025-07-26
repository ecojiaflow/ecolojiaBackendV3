// PATH: src/services/ai/productTypeDetector.ts
type Pattern = {
  label: string;
  keywords: string[];
};

type DetectedProduct = {
  label: string;
  score: number;
};

export default class ProductTypeDetector {
  private keywords: string[] = [];
  private patterns: Pattern[] = [];

  constructor() {
    this.buildKeywords();
    this.buildPatterns();
  }

  private buildKeywords() {
    this.keywords = [
      'savon',
      'shampoing',
      'lessive',
      'gel douche',
      'détergent',
      'nettoyant',
      'crème',
      'dentifrice',
      'biscuit',
      'céréales',
      'jus',
      'yaourt'
    ];
  }

  private buildPatterns() {
    this.patterns = [
      {
        label: 'cosmetics',
        keywords: ['savon', 'shampoing', 'gel douche', 'crème', 'dentifrice']
      },
      {
        label: 'detergents',
        keywords: ['lessive', 'détergent', 'nettoyant']
      },
      {
        label: 'food',
        keywords: ['biscuit', 'céréales', 'jus', 'yaourt']
      }
    ];
  }

  public detect(input: string): DetectedProduct {
    const lowerInput = input.toLowerCase();
    const matches: DetectedProduct[] = [];

    for (const pattern of this.patterns) {
      for (const word of pattern.keywords) {
        if (lowerInput.includes(word)) {
          matches.push({ label: pattern.label, score: 1 });
        }
      }
    }

    if (matches.length === 0) {
      return { label: 'unknown', score: 0 };
    }

    // Fusionner les scores par label
    const aggregated: Record<string, number> = {};

    for (const match of matches) {
      aggregated[match.label] = (aggregated[match.label] || 0) + 1;
    }

    const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
    return { label: sorted[0][0], score: sorted[0][1] };
  }

  public getAllLabels(): string[] {
    return this.patterns.map((p) => p.label);
  }

  public getKeywords(): string[] {
    return this.keywords;
  }
}
// EOF

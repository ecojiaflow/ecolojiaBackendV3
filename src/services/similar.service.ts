// PATH: src/services/similar.service.ts
type SimilarityInput = {
  text: string;
  options: string[];
};

export class SimilarService {
  private normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) =>
      Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b[i - 1] === a[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[b.length][a.length];
  }

  public findClosest({ text, options }: SimilarityInput): string {
    const normText = this.normalize(text);
    let bestMatch = options[0];
    let minDistance = Infinity;

    for (const option of options) {
      const normOption = this.normalize(option);
      const dist = this.levenshtein(normText, normOption);

      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = option;
      }
    }

    return bestMatch;
  }
}
// EOF

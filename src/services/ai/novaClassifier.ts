// PATH: backend/src/services/ai/novaClassifier.ts
/**
 * 🔬 NOVA Classifier (INSERM / ANSES 2024)
 * Détection : additifs, marqueurs industriels, ultra-transformation.
 * Sortie : groupe NOVA, confiance, impact santé, recommandations.
 */

import { Logger } from '../../utils/Logger';

const log   = new Logger('NovaClassifier');
const debug = (...a: unknown[]) =>
  process.env.NODE_ENV !== 'production' && (log as any).info(...a);

/* ═════════════════════════ CONSTANTES ═════════════════════════ */
const NOVA_DESC = {
  1: 'Non transformés ou minimalement transformés',
  2: 'Ingrédients culinaires transformés',
  3: 'Aliments transformés',
  4: 'Aliments ultra-transformés'
} as const;

const MARKERS = {
  adds: [
    'E102','E110','E124','E129','E131','E133','E150D','E151',
    'E220','E221','E222','E223','E224','E228',
    'E249','E250','E251','E252',
    'E320','E321','E338','E339','E340','E341','E450','E451','E452',
    'E471','E472A','E472B','E472C','E472E','E473','E475',
    'E950','E951','E952','E954','E955','E960','E961'
  ],
  indus: [
    'sirop de glucose-fructose','glucose-fructose','protéines hydrolysées',
    'isolat de protéine','huiles hydrogénées','sirop de maïs','maltodextrine',
    'dextrose','inuline','arômes artificiels','huile de palme'
  ],
  g1: ['eau','fruits','légumes','viande','poisson','œufs','lait'],
  g2: ['huile','beurre','sucre','sel','vinaigre','miel']
};

const HIGH_RISK = new Set([
  'E102','E110','E124','E129','E150D','E249','E250','E320','E321'
]);

type RiskLevel = 'low' | 'medium' | 'high';

/* ═════════════════════════ TYPES ═════════════════════════ */
export interface NovaAnalysis {
  totalCount: number;
  ultraProcessingMarkers: {
    type: string;
    value: string;
    risk: RiskLevel;
    impact: string;
  }[];
  industrialIngredients: string[];
  additives: string[];
  naturalIngredients: string[];
  suspiciousTerms: string[];
}

export interface NovaClassification {
  novaGroup: 1 | 2 | 3 | 4;
  groupInfo: { name: string; group: 1 | 2 | 3 | 4 };
  analysis: NovaAnalysis;
  confidence: number;
  scientificSource: string;
  healthImpact: { level: string; risks: string[]; desc: string };
  recommendations: string[];
}

/* ═════════════════════════ CLASSIFIER ═════════════════════════ */
class NovaClassifier {
  /** API asynchrone */
  async classify(p: { title?: string; ingredients: string[] | string }) {
    return this.classifyProduct(p);
  }

  /** Méthode publique pour usage externe */
  public classifyProduct(p: { title?: string; ingredients: string[] | string }): NovaClassification {
    const ingredients =
      Array.isArray(p.ingredients)
        ? p.ingredients
        : typeof p.ingredients === 'string'
        ? this.parseList(p.ingredients)
        : p.title
        ? this.extractFromTitle(p.title)
        : [];

    const analysis = this.analyze(ingredients);
    const group    = this.defineGroup(analysis);

    return {
      novaGroup: group,
      groupInfo: { name: NOVA_DESC[group], group },
      analysis,
      confidence: this.computeConfidence(analysis),
      scientificSource: 'NOVA – INSERM 2024',
      healthImpact: this.healthImpact(group),
      recommendations: this.recommend(group)
    };
  }

  /* ─────────── Helpers parsing ─────────── */
  private parseList(str: string) {
    return str.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  private extractFromTitle(text: string) {
    const lower = text.toLowerCase();
    const set   = new Set<string>();

    (text.match(/e\d{3,4}[a-z]?/gi) || []).forEach((e) => set.add(e));
    MARKERS.indus.forEach((i) => lower.includes(i) && set.add(i));
    ['arôme','colorant','conservateur','émulsifiant','stabilisant','édulcorant']
      .forEach((w) => lower.includes(w) && set.add(w));
    /coca-cola|soda|cola/i.test(lower) && set.add('soda ultra-transformé');

    return [...set];
  }

  /* ─────────── Analyse détaillée ─────────── */
  private analyze(items: string[]): NovaAnalysis {
    const lower = items.map((i) => i.toLowerCase());

    const additives  = this.detectAdditives(lower);
    const industrial = lower.filter((i) => MARKERS.indus.some((m) => i.includes(m)));
    const naturals   = lower.filter((i) => MARKERS.g1.some((g) => i.includes(g)));
    const suspicious = lower.filter((i) => /arôme|exhausteur|stabilisant|gélifiant/.test(i));

    /* Marqueurs typés correctement */
    const markers: NovaAnalysis['ultraProcessingMarkers'] = [
      ...additives.map((code): NovaAnalysis['ultraProcessingMarkers'][number] => ({
        type: 'additive',
        value: code,
        risk: HIGH_RISK.has(code) ? 'high' : 'medium',
        impact: 'Marqueur ultra-transformation'
      })),
      ...industrial.map((val): NovaAnalysis['ultraProcessingMarkers'][number] => ({
        type: 'industrial',
        value: val,
        risk: 'high',
        impact: 'Procédé industriel'
      })),
      ...lower
        .filter((v) => v.includes('arôme') && !v.includes('naturel'))
        .map((v): NovaAnalysis['ultraProcessingMarkers'][number] => ({
          type: 'artificial_flavor',
          value: v,
          risk: 'medium',
          impact: 'Arôme artificiel'
        }))
    ];

    return {
      totalCount: items.length,
      ultraProcessingMarkers: markers,
      industrialIngredients: industrial,
      additives,
      naturalIngredients: naturals,
      suspiciousTerms: suspicious
    };
  }

  private detectAdditives(list: string[]) {
    const set = new Set<string>();
    list.forEach((l) => {
      const m = l.match(/e\d{3,4}[a-z]?/gi);
      m && m.forEach((e) => set.add(e.toUpperCase()));
    });
    return [...set];
  }

  /* ─────────── Calcul groupe & confiance ─────────── */
  private defineGroup(a: NovaAnalysis): 1 | 2 | 3 | 4 {
    if (a.ultraProcessingMarkers.length) return 4;
    if (a.totalCount > 5)                return 3;
    if (!a.naturalIngredients.length && !a.additives.length && a.totalCount <= 2) return 2;
    return 1;
  }

  private computeConfidence(a: NovaAnalysis) {
    let c = 0.8;
    if (a.ultraProcessingMarkers.length > 2) c += 0.15;
    if (a.additives.length > 3)              c += 0.1;
    if (a.totalCount < 3)                    c -= 0.1;
    if (a.suspiciousTerms.length)            c -= 0.05;
    return Math.min(0.95, Math.max(0.6, c));
  }

  /* ─────────── Impact & reco ─────────── */
  private healthImpact(g: 1 | 2 | 3 | 4) {
    return {
      1: { level: 'positive',  risks: [], desc: 'Bénéfique pour la santé' },
      2: { level: 'neutral',   risks: ['Calories concentrées'], desc: 'Neutre si modéré' },
      3: { level: 'moderate',  risks: ['Sodium','Conservateurs'], desc: 'Consommation à limiter' },
      4: { level: 'high_risk', risks: ['↑ diabète','↑ cardio'], desc: 'À limiter fortement' }
    }[g];
  }

  private recommend(g: 1 | 2 | 3 | 4): string[] {
    if (g === 4) return ['🚨 Ultra-transformé : remplacez-le par une alternative naturelle.'];
    if (g === 3) return ['⚠️ À consommer occasionnellement.'];
    if (g === 2) return ['👍 Utilisez en quantité modérée.'];
    return ['✅ Excellent choix !'];
  }
}

/* ═════════════════════════ EXPORTS ═════════════════════════ */
export default NovaClassifier;
export const novaClassifier = new NovaClassifier();
// EOF

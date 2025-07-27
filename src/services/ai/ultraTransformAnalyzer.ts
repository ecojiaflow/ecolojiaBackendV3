// PATH: backend/src/services/ai/ultraTransformAnalyzer.ts
import { Logger } from '../../utils/Logger';

const log = new Logger('UltraTransform');
const debug = (...a: unknown[]) => process.env.NODE_ENV !== 'production' && log.info(...a);

/* ───── Types ───── */
export interface UltraTransformResult {
  score: number; // 0-10
  level: string;
  markers: string[];
  industrialProcesses: string[];
  nutritionalImpact: {
    vitaminLoss: number;
    mineralRetention: number;
    proteinDenaturation: number;
  };
  recommendations: string[];
}

/* ───── Données compactes ───── */
const PROC = {
  // level, impact, category
  mech: { broyage: [1, 'L'], découpe: [1, 'L'], pressage: [1, 'L'] },
  therm: { pasteurisation: [2, 'M'], stérilisation: [3, 'H'], uht: [3, 'H'], friture: [3, 'H'] },
  chem: { hydrogénation: [4, 'VH'], hydrolyse: [4, 'VH'], estérification: [5, 'E'] },
  extr: { raffinage: [3, 'H'], 'extraction solvant': [4, 'VH'], concentration: [2, 'M'] },
  mod: { extrusion: [4, 'VH'], texturation: [4, 'VH'], atomisation: [3, 'H'] }
};

const MARK = {
  ing: [
    { p: /sirop.*glucose.*fructose/i, l: 4, t: 'sweetener' },
    { p: /maltodextrine/i, l: 4, t: 'bulking' },
    { p: /amidon.*modifié/i, l: 4, t: 'thickener' },
    { p: /protéine.*hydrolysée/i, l: 5, t: 'protein' },
    { p: /isolat.*protéine/i, l: 4, t: 'protein' },
    { p: /huile.*hydrogénée/i, l: 5, t: 'fat' },
    { p: /arôme.*artificiel/i, l: 4, t: 'flavor' },
    { p: /édulcorant.*synthétique/i, l: 4, t: 'sweetener' }
  ],
  add: [
    { p: /e4\d{2}/i, l: 3, f: 'texture' },
    { p: /e3[2-8]\d/i, l: 3, f: 'preservation' },
    { p: /e9[5-6]\d/i, l: 4, f: 'sweetener' }
  ],
  term: [
    { p: /instantané/i, l: 3 },
    { p: /reconstitué/i, l: 3 },
    { p: /enrichi.*vitamines/i, l: 2 },
    { p: /longue.*conservation/i, l: 3 },
    { p: /lyophilisé/i, l: 3 }
  ]
};

/* ───── Analyseur optimisé ───── */
export class UltraTransformAnalyzer {
  async analyze(ingredients: string[]): Promise<UltraTransformResult> {
    debug(`Analyse: ${ingredients.length} ingrédients`);
    
    const ingsStr = ingredients.join(' ').toLowerCase();
    
    // Détections
    const methods = this.detectMethods(ingsStr);
    const markers = this.detectMarkers(ingredients);
    
    // Score (0-10)
    const score = this.calcScore(methods, markers);
    
    // Impact nutritionnel
    const impact = this.calcImpact(methods, score);
    
    // Level
    const level = score >= 8 ? 'Extrême' : score >= 6 ? 'Très élevé' : 
                  score >= 4 ? 'Élevé' : score >= 2 ? 'Modéré' : 'Faible';
    
    debug(`Score: ${score}/10, Level: ${level}`);
    
    return {
      score,
      level,
      markers: markers.map(m => m.desc),
      industrialProcesses: methods.map(m => m.name),
      nutritionalImpact: impact,
      recommendations: this.getReco(score)
    };
  }
  
  private detectMethods(ings: string): any[] {
    const found: any[] = [];
    
    // Check all process categories
    Object.entries(PROC).forEach(([cat, procs]) => {
      Object.entries(procs).forEach(([name, [level, impact]]) => {
        if (ings.includes(name)) {
          found.push({ name, level, impact, cat });
        }
      });
    });
    
    // Indices spécifiques
    if (ings.includes('huile') && ings.includes('palme')) {
      found.push({ name: 'raffinage intensif', level: 4, impact: 'VH', cat: 'extr' });
    }
    if (/sirop.*glucose|glucose.*fructose/i.test(ings)) {
      found.push({ name: 'hydrolyse enzymatique', level: 4, impact: 'VH', cat: 'chem' });
    }
    
    return found;
  }
  
  private detectMarkers(ings: string[]): any[] {
    const markers: any[] = [];
    const ingsStr = ings.join(' ');
    
    // Ingrédients industriels
    MARK.ing.forEach(m => {
      if (m.p.test(ingsStr)) {
        markers.push({ 
          desc: `Ingrédient industriel: ${ingsStr.match(m.p)?.[0]}`, 
          level: m.l 
        });
      }
    });
    
    // Additifs - CORRECTION ICI
    const adds = ingsStr.match(/e\d{3,4}/gi) || [];
    adds.forEach(a => {
      markers.push({ 
        desc: `Additif: ${String(a).toUpperCase()}`, // ✅ CORRECTION: String(a) au lieu de a directement
        level: 3 
      });
    });
    
    // Termes process
    MARK.term.forEach(t => {
      if (t.p.test(ingsStr)) {
        markers.push({ 
          desc: `Indicateur: ${ingsStr.match(t.p)?.[0]}`, 
          level: t.l 
        });
      }
    });
    
    return markers;
  }
  
  private calcScore(methods: any[], markers: any[]): number {
    // Moyennes pondérées
    const mScore = methods.length ? 
      methods.reduce((s, m) => s + m.level, 0) / methods.length : 0;
    const mkScore = markers.length ? 
      markers.reduce((s, m) => s + m.level, 0) / markers.length : 0;
    
    let score = (mScore * 0.6) + (mkScore * 0.4);
    
    // Ajustements
    if (methods.some(m => m.cat === 'chem')) score += 0.5;
    if (markers.filter(m => m.desc.includes('Additif')).length > 5) score += 0.5;
    if (methods.some(m => m.impact === 'E')) score = Math.max(score, 4.5);
    
    return Math.min(10, Math.round(score));
  }
  
  private calcImpact(methods: any[], score: number) {
    const therm = methods.filter(m => m.cat === 'therm').length;
    const chem = methods.filter(m => m.cat === 'chem').length;
    
    return {
      vitaminLoss: Math.min(80, 10 + (therm * 15) + (score * 10)),
      mineralRetention: Math.max(50, 95 - (chem * 10) - (score * 5)),
      proteinDenaturation: Math.min(70, 5 + (therm * 10) + (chem * 15))
    };
  }
  
  private getReco(score: number): string[] {
    if (score >= 8) return [
      '❌ Transformation extrême',
      '🧪 Nombreux procédés chimiques',
      '🌱 Optez pour du naturel'
    ];
    if (score >= 6) return [
      '🚨 Ultra-transformation élevée',
      '🏠 Préférez le fait-maison',
      '⚡ Impact nutritionnel important'
    ];
    if (score >= 4) return [
      '⚠️ Transformation importante',
      '🔄 Cherchez des alternatives',
      '📊 Vérifiez les nutriments'
    ];
    if (score >= 2) return [
      '👍 Transformation modérée',
      '💡 Privilégiez moins transformé',
      '🥗 Complétez avec du frais'
    ];
    return [
      '✅ Transformation minimale',
      '🌟 Excellent choix santé',
      '💚 Nutriments préservés'
    ];
  }
}

export const ultraTransformAnalyzer = new UltraTransformAnalyzer();
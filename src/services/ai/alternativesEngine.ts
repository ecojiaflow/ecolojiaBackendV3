// PATH: backend/src/services/ai/alternativesEngine.ts
import { Logger } from '../../utils/Logger';

const log = new Logger('AlternativesEngine');
const debug = (...a: unknown[]) => process.env.NODE_ENV !== 'production' && log.info(...a);

/* â”€â”€â”€â”€â”€ Types â”€â”€â”€â”€â”€ */
export interface AlternativeRequest {
  productName: string;
  category: 'food' | 'cosmetics' | 'detergents';
  currentScore: number;
}

export interface Alternative {
  name: string;
  score: number;
  reasons: string[];
}

/* â”€â”€â”€â”€â”€ Base de donnÃ©es compacte â”€â”€â”€â”€â”€ */
const ALT_DB = {
  food: {
    'soda': [
      { n: 'Eau pÃ©tillante + citron', s: 95, r: ['Sans sucre', 'Naturel', 'Hydratant'] },
      { n: 'Kombucha maison', s: 85, r: ['Probiotiques', 'Peu sucrÃ©', 'FermentÃ©'] },
      { n: 'ThÃ© glacÃ© maison', s: 90, r: ['Antioxydants', 'ContrÃ´le sucre', 'Naturel'] }
    ],
    'chips': [
      { n: 'Chips lÃ©gumes maison', s: 80, r: ['Sans additifs', 'Fibres', 'Vitamines'] },
      { n: 'Noix grillÃ©es', s: 85, r: ['ProtÃ©ines', 'Bon gras', 'MinÃ©raux'] },
      { n: 'Popcorn nature', s: 75, r: ['Fibres', 'Peu calorique', 'Simple'] }
    ],
    'biscuit': [
      { n: 'Biscuits avoine maison', s: 85, r: ['Fibres', 'Sans additifs', 'Personnalisable'] },
      { n: 'Fruits secs', s: 90, r: ['Naturel', 'Nutriments', 'Sans sucre ajoutÃ©'] },
      { n: 'Barres cÃ©rÃ©ales maison', s: 80, r: ['ContrÃ´le ingrÃ©dients', 'Ã‰nergie', 'Sain'] }
    ],
    'default': [
      { n: 'Version bio', s: 70, r: ['Sans pesticides', 'Meilleure qualitÃ©'] },
      { n: 'Version maison', s: 85, r: ['Sans additifs', 'Frais', 'Ã‰conomique'] },
      { n: 'Alternative locale', s: 75, r: ['Circuit court', 'Frais', 'Ã‰cologique'] }
    ]
  },
  cosmetics: {
    'crÃ¨me': [
      { n: 'Huile vÃ©gÃ©tale pure', s: 90, r: ['100% naturel', 'Multi-usage', 'Sans conservateurs'] },
      { n: 'Beurre de karitÃ©', s: 85, r: ['Naturel', 'Nourrissant', 'Simple'] },
      { n: 'Aloe vera gel', s: 88, r: ['Apaisant', 'Naturel', 'Hydratant'] }
    ],
    'shampoing': [
      { n: 'Shampoing solide', s: 85, r: ['Sans plastique', 'ConcentrÃ©', 'Naturel'] },
      { n: 'No-poo (bicarbonate)', s: 75, r: ['ZÃ©ro dÃ©chet', 'Ã‰conomique', 'Simple'] },
      { n: 'Rhassoul', s: 80, r: ['Argile naturelle', 'Purifiant', 'Traditionnel'] }
    ],
    'default': [
      { n: 'Version bio certifiÃ©e', s: 80, r: ['Sans chimiques', 'ContrÃ´lÃ©', 'Respectueux'] },
      { n: 'DIY maison', s: 85, r: ['PersonnalisÃ©', 'Ã‰conomique', 'Sans conservateurs'] },
      { n: 'Marque minimaliste', s: 75, r: ['Peu d\'ingrÃ©dients', 'Transparent', 'Efficace'] }
    ]
  },
  detergents: {
    'lessive': [
      { n: 'Savon de Marseille', s: 90, r: ['Naturel', 'BiodÃ©gradable', 'Ã‰conomique'] },
      { n: 'Noix de lavage', s: 85, r: ['100% vÃ©gÃ©tal', 'Compostable', 'HypoallergÃ©nique'] },
      { n: 'Lessive maison', s: 88, r: ['ContrÃ´le total', 'Ã‰conomique', 'Ã‰cologique'] }
    ],
    'nettoyant': [
      { n: 'Vinaigre blanc', s: 95, r: ['Multi-usage', 'DÃ©sinfectant', 'Ã‰conomique'] },
      { n: 'Bicarbonate', s: 92, r: ['DÃ©graissant', 'DÃ©sodorisant', 'Non toxique'] },
      { n: 'Savon noir', s: 88, r: ['Traditionnel', 'Efficace', 'BiodÃ©gradable'] }
    ],
    'default': [
      { n: 'Version Ã©colabel', s: 80, r: ['CertifiÃ©', 'TestÃ©', 'Performant'] },
      { n: 'Recette maison', s: 85, r: ['Simple', 'Ã‰conomique', 'PersonnalisÃ©'] },
      { n: 'ConcentrÃ© Ã©cologique', s: 75, r: ['Moins d\'emballage', 'Efficace', 'Durable'] }
    ]
  }
};

const DIY = {
  'nettoyant': '50% vinaigre + 50% eau + citron',
  'lessive': 'Savon rÃ¢pÃ© + bicarbonate + cristaux soude',
  'dentifrice': 'Bicarbonate + huile coco + menthe',
  'crÃ¨me': 'Beurre karitÃ© + huile + vitamine E',
  'masque': 'Argile + eau florale + huile',
  'shampoing': 'Savon noir + huiles essentielles'
};

/* â”€â”€â”€â”€â”€ Moteur d'alternatives â”€â”€â”€â”€â”€ */
export class AlternativesEngine {
  async generate(req: AlternativeRequest): Promise<Alternative[]> {
    debug(`GÃ©nÃ©ration alternatives pour ${req.productName}`);
    
    // DÃ©tection type produit
    const type = this.detectType(req.productName.toLowerCase());
    
    // RÃ©cupÃ©ration alternatives
    const alts = (ALT_DB as any)[req.category]?.[type] || (ALT_DB as any)[req.category]?.default || [];
    
    // Tri par score et ajout contexte
    return alts
      .map((a: any) => ({
        name: a.n,
        score: a.s,
        reasons: [
          ...a.r,
          req.currentScore < 50 ? 'ðŸ”„ Meilleure alternative' : 'âœ… Option valide'
        ]
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);
  }
  
  getDIYRecipe(product: string): string {
    const key = Object.keys(DIY).find(k => product.toLowerCase().includes(k));
    return DIY[key as keyof typeof DIY] || 'Recette non disponible';
  }
  
  private detectType(name: string): string {
    // Food
    if (/soda|cola|boisson/i.test(name)) return 'soda';
    if (/chips|crisps|frites/i.test(name)) return 'chips';
    if (/biscuit|cookie|gÃ¢teau/i.test(name)) return 'biscuit';
    // Cosmetics
    if (/crÃ¨me|lotion|moisturizer/i.test(name)) return 'crÃ¨me';
    if (/shamp|cheveux/i.test(name)) return 'shampoing';
    // Detergents
    if (/lessive|detergent|lavage/i.test(name)) return 'lessive';
    if (/nettoyant|clean|spray/i.test(name)) return 'nettoyant';
    
    return 'default';
  }
}

export const alternativesEngine = new AlternativesEngine();

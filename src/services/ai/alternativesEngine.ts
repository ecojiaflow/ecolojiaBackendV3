// PATH: backend/src/services/ai/alternativesEngine.ts
import { Logger } from '../../utils/Logger';

const log = new Logger('AlternativesEngine');
const debug = (...a: unknown[]) => process.env.NODE_ENV !== 'production' && log.info(...a);

/* ───── Types ───── */
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

/* ───── Base de données compacte ───── */
const ALT_DB = {
  food: {
    'soda': [
      { n: 'Eau pétillante + citron', s: 95, r: ['Sans sucre', 'Naturel', 'Hydratant'] },
      { n: 'Kombucha maison', s: 85, r: ['Probiotiques', 'Peu sucré', 'Fermenté'] },
      { n: 'Thé glacé maison', s: 90, r: ['Antioxydants', 'Contrôle sucre', 'Naturel'] }
    ],
    'chips': [
      { n: 'Chips légumes maison', s: 80, r: ['Sans additifs', 'Fibres', 'Vitamines'] },
      { n: 'Noix grillées', s: 85, r: ['Protéines', 'Bon gras', 'Minéraux'] },
      { n: 'Popcorn nature', s: 75, r: ['Fibres', 'Peu calorique', 'Simple'] }
    ],
    'biscuit': [
      { n: 'Biscuits avoine maison', s: 85, r: ['Fibres', 'Sans additifs', 'Personnalisable'] },
      { n: 'Fruits secs', s: 90, r: ['Naturel', 'Nutriments', 'Sans sucre ajouté'] },
      { n: 'Barres céréales maison', s: 80, r: ['Contrôle ingrédients', 'Énergie', 'Sain'] }
    ],
    'default': [
      { n: 'Version bio', s: 70, r: ['Sans pesticides', 'Meilleure qualité'] },
      { n: 'Version maison', s: 85, r: ['Sans additifs', 'Frais', 'Économique'] },
      { n: 'Alternative locale', s: 75, r: ['Circuit court', 'Frais', 'Écologique'] }
    ]
  },
  cosmetics: {
    'crème': [
      { n: 'Huile végétale pure', s: 90, r: ['100% naturel', 'Multi-usage', 'Sans conservateurs'] },
      { n: 'Beurre de karité', s: 85, r: ['Naturel', 'Nourrissant', 'Simple'] },
      { n: 'Aloe vera gel', s: 88, r: ['Apaisant', 'Naturel', 'Hydratant'] }
    ],
    'shampoing': [
      { n: 'Shampoing solide', s: 85, r: ['Sans plastique', 'Concentré', 'Naturel'] },
      { n: 'No-poo (bicarbonate)', s: 75, r: ['Zéro déchet', 'Économique', 'Simple'] },
      { n: 'Rhassoul', s: 80, r: ['Argile naturelle', 'Purifiant', 'Traditionnel'] }
    ],
    'default': [
      { n: 'Version bio certifiée', s: 80, r: ['Sans chimiques', 'Contrôlé', 'Respectueux'] },
      { n: 'DIY maison', s: 85, r: ['Personnalisé', 'Économique', 'Sans conservateurs'] },
      { n: 'Marque minimaliste', s: 75, r: ['Peu d\'ingrédients', 'Transparent', 'Efficace'] }
    ]
  },
  detergents: {
    'lessive': [
      { n: 'Savon de Marseille', s: 90, r: ['Naturel', 'Biodégradable', 'Économique'] },
      { n: 'Noix de lavage', s: 85, r: ['100% végétal', 'Compostable', 'Hypoallergénique'] },
      { n: 'Lessive maison', s: 88, r: ['Contrôle total', 'Économique', 'Écologique'] }
    ],
    'nettoyant': [
      { n: 'Vinaigre blanc', s: 95, r: ['Multi-usage', 'Désinfectant', 'Économique'] },
      { n: 'Bicarbonate', s: 92, r: ['Dégraissant', 'Désodorisant', 'Non toxique'] },
      { n: 'Savon noir', s: 88, r: ['Traditionnel', 'Efficace', 'Biodégradable'] }
    ],
    'default': [
      { n: 'Version écolabel', s: 80, r: ['Certifié', 'Testé', 'Performant'] },
      { n: 'Recette maison', s: 85, r: ['Simple', 'Économique', 'Personnalisé'] },
      { n: 'Concentré écologique', s: 75, r: ['Moins d\'emballage', 'Efficace', 'Durable'] }
    ]
  }
};

const DIY = {
  'nettoyant': '50% vinaigre + 50% eau + citron',
  'lessive': 'Savon râpé + bicarbonate + cristaux soude',
  'dentifrice': 'Bicarbonate + huile coco + menthe',
  'crème': 'Beurre karité + huile + vitamine E',
  'masque': 'Argile + eau florale + huile',
  'shampoing': 'Savon noir + huiles essentielles'
};

/* ───── Moteur d'alternatives ───── */
export class AlternativesEngine {
  async generate(req: AlternativeRequest): Promise<Alternative[]> {
    debug(`Génération alternatives pour ${req.productName}`);
    
    // Détection type produit
    const type = this.detectType(req.productName.toLowerCase());
    
    // Récupération alternatives
    const alts = ALT_DB[req.category]?.[type] || ALT_DB[req.category]?.default || [];
    
    // Tri par score et ajout contexte
    return alts
      .map(a => ({
        name: a.n,
        score: a.s,
        reasons: [
          ...a.r,
          req.currentScore < 50 ? '🔄 Meilleure alternative' : '✅ Option valide'
        ]
      }))
      .sort((a, b) => b.score - a.score)
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
    if (/biscuit|cookie|gâteau/i.test(name)) return 'biscuit';
    // Cosmetics
    if (/crème|lotion|moisturizer/i.test(name)) return 'crème';
    if (/shamp|cheveux/i.test(name)) return 'shampoing';
    // Detergents
    if (/lessive|detergent|lavage/i.test(name)) return 'lessive';
    if (/nettoyant|clean|spray/i.test(name)) return 'nettoyant';
    
    return 'default';
  }
}

export const alternativesEngine = new AlternativesEngine();
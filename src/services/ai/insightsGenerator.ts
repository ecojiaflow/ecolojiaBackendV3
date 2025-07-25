// PATH: backend/src/services/ai/insightsGenerator.ts
import { Logger } from '../../utils/Logger';

const log = new Logger('InsightsGenerator');
const debug = (...a: unknown[]) => process.env.NODE_ENV !== 'production' && log.info(...a);

/* ───── Types ───── */
export interface InsightRequest {
  product: string;
  score: number;
  category: 'food' | 'cosmetics' | 'detergents';
  analysis: any;
}

export interface InsightResult {
  insights: string[];
  recommendations: string[];
  tips: string[];
  warnings: string[];
}

/* ───── Templates d'insights ───── */
const TEMPLATES = {
  food: {
    nova: {
      1: ['✨ Non transformé', '🌱 Base saine'],
      2: ['🍳 Ingrédient culinaire', '💡 Usage modéré'],
      3: ['🏭 Transformé', '📊 Conservateurs simples'],
      4: ['⚠️ Ultra-transformé', '🧪 Additifs multiples']
    },
    ultra: {
      high: ['🏭 Transformation élevée', '📈 Risque chronique'],
      med: ['⚙️ Transformation modérée', '💡 Préférez moins transformé']
    },
    reco: {
      good: ['✅ Excellent choix !', '💚 Continuez ainsi'],
      bad: ['⚡ Consommation occasionnelle', '🏠 Privilégiez maison']
    }
  },
  cosmetics: {
    hazard: {
      high: ['⚠️ Ingrédients préoccupants', '🔬 Composants surveillés'],
      pe: ['🚨 Perturbateurs endocriniens', '👶 Éviter grossesse'],
      allerg: ['🌸 Allergènes présents', '💡 Test préalable']
    },
    reco: {
      good: ['✨ Formulation saine', '🌿 Bonne tolérance'],
      bad: ['🚫 Ingrédients controversés', '🔄 Cherchez alternatives']
    }
  },
  detergents: {
    impact: {
      aqua: ['🐟 Impact aquatique', '💧 Dosez minimum'],
      bio: ['♻️ Biodégradabilité limitée', '⏳ Persistant'],
      voc: ['💨 Émissions volatiles', '🪟 Ventilez']
    },
    reco: {
      good: ['🧼 Impact acceptable', '🌱 Dosage correct'],
      bad: ['🌍 Impact élevé', '🏆 Préférez écolabel']
    }
  },
  general: {
    score: {
      80: ['🌟 Excellent !', '💚 Impact minimal'],
      60: ['👍 Bon produit', '📊 Performance correcte'],
      40: ['⚠️ Moyen', '🔍 Comparez'],
      0: ['❌ Problématique', '🚫 Évitez']
    }
  }
};

/* ───── Générateur optimisé ───── */
export class InsightsGenerator {
  async generate(req: InsightRequest): Promise<InsightResult> {
    debug(`Insights pour ${req.product}`);
    
    const ins: string[] = [];
    const reco: string[] = [];
    const tips: string[] = [];
    const warn: string[] = [];
    
    // Insights par catégorie
    switch (req.category) {
      case 'food':
        this.genFood(req, ins, reco, tips, warn);
        break;
      case 'cosmetics':
        this.genCos(req, ins, reco, tips, warn);
        break;
      case 'detergents':
        this.genDet(req, ins, reco, tips, warn);
        break;
    }
    
    // Insights score
    this.genScore(req.score, ins, reco);
    
    // Motivation
    if (req.score < 60) {
      reco.push('💪 Chaque changement compte');
      reco.push('🌍 Impact positif possible');
    }
    
    return {
      insights: [...new Set(ins)],
      recommendations: [...new Set(reco)],
      tips: [...new Set(tips)],
      warnings: [...new Set(warn)]
    };
  }
  
  private genFood(req: InsightRequest, i: string[], r: string[], t: string[], w: string[]) {
    const a = req.analysis;
    
    // NOVA
    if (a.nova) {
      i.push(...TEMPLATES.food.nova[a.nova.group as keyof typeof TEMPLATES.food.nova]);
      if (a.nova.group >= 3) {
        r.push(...TEMPLATES.food.reco.bad);
      }
      if (a.nova.additives?.some((ad: any) => ad.riskLevel === 'high')) {
        w.push('🚨 Additifs à risque élevé');
      }
    }
    
    // Ultra-transform
    if (a.ultra?.score > 7) {
      i.push(...TEMPLATES.food.ultra.high);
      w.push('📈 Risque maladies chroniques');
      t.push('💡 Perturbation signaux satiété');
    } else if (a.ultra?.score > 4) {
      i.push(...TEMPLATES.food.ultra.med);
    }
    
    // Marqueurs spécifiques
    if (a.ultra?.markers?.some((m: string) => /hydrogén/i.test(m))) {
      w.push('🚫 Acides gras trans');
      i.push('❤️ Risque cardiovasculaire');
    }
    
    // Tips généraux
    t.push('💡 Variez les sources');
    if (req.score < 40) {
      r.push('🥗 Compensez avec du frais');
      r.push('💧 Hydratez-vous bien');
    }
  }
  
  private genCos(req: InsightRequest, i: string[], r: string[], t: string[], w: string[]) {
    const a = req.analysis;
    
    if (a.cosmeticsHazard) {
      if (a.cosmeticsHazard.score >= 2) {
        i.push(...TEMPLATES.cosmetics.hazard.high);
      }
      if (a.cosmeticsHazard.endocrineDisruptors?.length) {
        w.push(...TEMPLATES.cosmetics.hazard.pe);
        r.push('🔄 Alternatives sans PE');
      }
      if (a.cosmeticsHazard.allergens?.length) {
        i.push(...TEMPLATES.cosmetics.hazard.allerg);
        r.push('🔍 Surveillez réactions');
      }
      if (a.cosmeticsHazard.naturalityScore >= 8) {
        i.push('🌿 Haute naturalité');
      }
    }
    
    // Tips
    t.push('💧 Appliquez peau propre');
    t.push('🌞 Protection solaire jour');
    
    r.push(...(req.score >= 50 ? TEMPLATES.cosmetics.reco.good : TEMPLATES.cosmetics.reco.bad));
  }
  
  private genDet(req: InsightRequest, i: string[], r: string[], t: string[], w: string[]) {
    const a = req.analysis;
    
    if (a.detergentImpact) {
      if (a.detergentImpact.aquaticToxicity >= 7) {
        w.push(...TEMPLATES.detergents.impact.aqua);
        r.push('🚰 Jamais dans nature');
      }
      if (a.detergentImpact.biodegradability <= 60) {
        w.push(...TEMPLATES.detergents.impact.bio);
      } else if (a.detergentImpact.biodegradability >= 90) {
        i.push('✅ Excellente biodégradabilité');
      }
      if (a.detergentImpact.vocEmissions >= 7) {
        w.push(...TEMPLATES.detergents.impact.voc);
        r.push('😷 Évitez inhalation');
      }
      if (a.detergentImpact.ecoLabel) {
        i.push('🏆 Certifié écologique');
      }
    }
    
    // Tips éco
    t.push('📏 Respectez doses');
    t.push('🌡️ Lavez froid si possible');
    t.push('💧 Surdosage inutile');
    
    r.push(...(req.score >= 50 ? TEMPLATES.detergents.reco.good : TEMPLATES.detergents.reco.bad));
  }
  
  private genScore(score: number, i: string[], r: string[]) {
    const t = score >= 80 ? 80 : score >= 60 ? 60 : score >= 40 ? 40 : 0;
    i.push(...TEMPLATES.general.score[t as keyof typeof TEMPLATES.general.score]);
    
    if (score < 60) {
      r.push('🔍 Comparez options');
    }
  }
}

export const insightsGenerator = new InsightsGenerator();
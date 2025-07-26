"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthScoreCalculator = exports.HealthScoreCalculator = void 0;
// PATH: backend/src/services/ai/HealthScoreCalculator.ts
const Logger_1 = require("../../utils/Logger");
/* ───── Logger (silencieux en prod) ───── */
const log = new Logger_1.Logger('HealthScoreCalculator');
const debug = (...a) => process.env.NODE_ENV !== 'production' && log.info(...a);
/* ───── Pondérations constantes ───── */
const FOOD_W = {
    nova: { 1: 0, 2: 10, 3: 30, 4: 50 },
    ultraM: 5,
    addHigh: 10,
    addMed: 5,
    addCap: 30,
    natPer: 2,
    natCap: 10
};
const COS_W = { hazard: 20, endocrine: 15, allergen: 10, natThr: 50, natStep: 5 };
const DET_W = { aqM: 5, bioTarget: 90, bioMul: 0.5, vocM: 3, bioBonus: 10, bioThr: 95 };
/* ───── Catégories valides ───── */
const VALID_CATEGORIES = ['food', 'cosmetics', 'detergents'];
/* ───── Calculateur ───── */
class HealthScoreCalculator {
    calculate(i) {
        // Validation ajoutée
        if (!i.category || !VALID_CATEGORIES.includes(i.category)) {
            throw new Error(`Invalid category: ${i.category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }
        debug(`Calcul score ${i.productName} (${i.category})`);
        const r = i.category === 'food'
            ? this.food(i)
            : i.category === 'cosmetics'
                ? this.cos(i)
                : this.det(i);
        debug(`Score ${r.score}/100 ${this.emoji(r.category)}`);
        return r;
    }
    /* Food */
    food(i) {
        const b = { base: 100, penalties: [], bonuses: [] };
        if (i.novaAnalysis) {
            const p = FOOD_W.nova[i.novaAnalysis.group];
            p &&
                b.penalties.push({
                    reason: `NOVA ${i.novaAnalysis.group}`,
                    points: p,
                    severity: p >= 40 ? 'high' : p >= 20 ? 'medium' : 'low'
                });
        }
        if (i.ultraTransformAnalysis) {
            const pts = Math.round(i.ultraTransformAnalysis.score * FOOD_W.ultraM);
            pts &&
                b.penalties.push({
                    reason: 'Ultra-transformation',
                    points: pts,
                    severity: pts >= 30 ? 'high' : pts >= 15 ? 'medium' : 'low'
                });
        }
        const adds = i.novaAnalysis?.additives || [];
        const high = adds.filter((a) => a.riskLevel === 'high').length;
        const med = adds.filter((a) => a.riskLevel === 'medium').length;
        const addPts = Math.min(FOOD_W.addCap, high * FOOD_W.addHigh + med * FOOD_W.addMed);
        addPts &&
            b.penalties.push({
                reason: `${high + med} additifs à risque`,
                points: addPts,
                severity: high ? 'high' : 'medium'
            });
        const nat = this.naturalCount(i.ingredients);
        nat &&
            b.bonuses.push({
                reason: `${nat} ingr. naturels`,
                points: Math.min(FOOD_W.natCap, nat * FOOD_W.natPer)
            });
        const score = this.final(b);
        const extra = i.novaAnalysis?.group === 4 ? ['🏭 Ultra-transformé'] : [];
        return {
            score,
            category: this.cat(score),
            breakdown: b,
            recommendations: this.reco(score, 'food', extra),
            scientificBasis: [
                'INSERM 2024 (NOVA)',
                'ANSES 2024 (Ultra-transformation)',
                'EFSA Additifs'
            ],
            confidence: i.novaAnalysis?.confidence ?? 0.85
        };
    }
    /* Cosmetics */
    cos(i) {
        const b = { base: 100, penalties: [], bonuses: [] };
        const cx = i.cosmeticsAnalysis;
        if (cx) {
            cx.hazardScore &&
                b.penalties.push({
                    reason: 'Ingrédients à risque',
                    points: cx.hazardScore * COS_W.hazard,
                    severity: cx.hazardScore >= 2 ? 'high' : 'medium'
                });
            cx.endocrineDisruptors.length &&
                b.penalties.push({
                    reason: 'Perturbateurs endocriniens',
                    points: cx.endocrineDisruptors.length * COS_W.endocrine,
                    severity: 'high'
                });
            cx.allergens.length &&
                b.penalties.push({
                    reason: 'Allergènes',
                    points: cx.allergens.length * COS_W.allergen,
                    severity: 'medium'
                });
            if (cx.naturalityScore > COS_W.natThr) {
                b.bonuses.push({
                    reason: `Naturalité ${cx.naturalityScore}%`,
                    points: Math.round((cx.naturalityScore - 50) / COS_W.natStep)
                });
            }
        }
        const score = this.final(b);
        const extra = cx?.endocrineDisruptors.length ? ['👶 Éviter grossesse'] : [];
        return {
            score,
            category: this.cat(score),
            breakdown: b,
            recommendations: this.reco(score, 'cosmetics', extra),
            scientificBasis: ['CosIng', 'ANSES 2024', 'EWG'],
            confidence: 0.9
        };
    }
    /* Detergents */
    det(i) {
        const b = { base: 100, penalties: [], bonuses: [] };
        const d = i.detergentsAnalysis;
        if (d) {
            const tox = d.aquaticToxicity * DET_W.aqM;
            tox &&
                b.penalties.push({
                    reason: 'Toxicité aquatique',
                    points: tox,
                    severity: d.aquaticToxicity >= 7 ? 'high' : 'medium'
                });
            if (d.biodegradability < DET_W.bioTarget) {
                b.penalties.push({
                    reason: `Biodégradabilité ${d.biodegradability}%`,
                    points: Math.round((DET_W.bioTarget - d.biodegradability) * DET_W.bioMul),
                    severity: d.biodegradability < 60 ? 'high' : 'medium'
                });
            }
            else if (d.biodegradability >= DET_W.bioThr) {
                b.bonuses.push({ reason: 'Haute biodégradabilité', points: DET_W.bioBonus });
            }
            const voc = d.vocEmissions * DET_W.vocM;
            voc &&
                b.penalties.push({
                    reason: 'Émissions COV',
                    points: voc,
                    severity: d.vocEmissions >= 7 ? 'high' : 'low'
                });
        }
        const score = this.final(b);
        const extra = d?.aquaticToxicity > 7 ? ['🐟 Danger aquatique'] : [];
        return {
            score,
            category: this.cat(score),
            breakdown: b,
            recommendations: this.reco(score, 'detergents', extra),
            scientificBasis: ['UE 648/2004', 'INERIS', 'ADEME'],
            confidence: 0.88
        };
    }
    /* ───── utilitaires communs ───── */
    final(b) {
        const pen = b.penalties.reduce((s, p) => s + p.points, 0);
        const bon = b.bonuses.reduce((s, p) => s + p.points, 0);
        return Math.max(0, Math.min(100, b.base - pen + bon));
    }
    cat(s) {
        if (s >= 80)
            return 'excellent';
        if (s >= 60)
            return 'bon';
        if (s >= 40)
            return 'moyen';
        if (s >= 20)
            return 'mauvais';
        return 'très_mauvais';
    }
    emoji(cat) {
        return { excellent: '🟢', bon: '🟩', moyen: '🟡', mauvais: '🟠', très_mauvais: '🔴' }[cat];
    }
    naturalCount(list) {
        const regex = /fruits?|légumes?|eau|sel|huile|miel|farine|bio|naturel/i;
        return list.filter((i) => regex.test(i)).length;
    }
    /* Recommandations génériques avec extras optionnels */
    reco(score, type, extra = []) {
        const baseReco = {
            food: score >= 60
                ? ['🥗 Bon équilibre', '📊 Surveillez la portion']
                : ['⚠️ Modérez la consommation', '🥕 Privilégiez le fait-maison'],
            cosmetics: score >= 60
                ? ['🧴 Formulation correcte', '✨ Usage normal']
                : ['🚫 Ingrédients controversés', '🔄 Cherchez des alternatives'],
            detergents: score >= 60
                ? ['🧼 Impact acceptable', '🌱 Dosez correctement']
                : ['🌍 Impact élevé', '🔄 Préférez un écolabel']
        };
        return [...(baseReco[type] || []), ...extra];
    }
    /* Méthode publique pour générer un résumé textuel */
    generateSummary(result, productName) {
        const msgs = {
            'excellent': `${productName} : excellent score ${result.score}/100 🌟`,
            'bon': `${productName} : bon score ${result.score}/100 ✅`,
            'moyen': `${productName} : score moyen ${result.score}/100 ⚠️`,
            'mauvais': `${productName} : score faible ${result.score}/100 ❌`,
            'très_mauvais': `${productName} : score très faible ${result.score}/100 🚫`
        };
        return msgs[result.category];
    }
}
exports.HealthScoreCalculator = HealthScoreCalculator;
/* ───── Singleton ───── */
exports.healthScoreCalculator = new HealthScoreCalculator();

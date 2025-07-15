"use strict";
const fs = require('fs').promises;
const path = require('path');
class InsightsGenerator {
    constructor() {
        this.insightsDB = null;
        this.loadDatabase();
    }
    async loadDatabase() {
        try {
            const dbPath = path.join(__dirname, '../../data/educational-insights-db.json');
            const data = await fs.readFile(dbPath, 'utf8');
            this.insightsDB = JSON.parse(data);
            console.log('✅ Educational insights database loaded successfully');
        }
        catch (error) {
            console.error('❌ Error loading insights database:', error);
            this.insightsDB = { nutrition_insights: {}, environmental_insights: {}, health_insights: {} };
        }
    }
    /**
     * Génère des insights éducatifs personnalisés pour un produit
     * @param {Object} productData - Données du produit analysé
     * @param {Object} userProfile - Profil utilisateur pour personnalisation
     * @returns {Array} Liste des insights éducatifs pertinents
     */
    async generateInsights(productData, userProfile = {}) {
        if (!this.insightsDB) {
            await this.loadDatabase();
        }
        const insights = [];
        // 1. Insights basés sur les problèmes détectés dans le produit
        const productIssues = this.analyzeProductIssues(productData);
        const issueInsights = this.getInsightsForIssues(productIssues);
        insights.push(...issueInsights);
        // 2. Insights généraux sur la catégorie de produit
        const categoryInsights = this.getCategoryInsights(productData);
        insights.push(...categoryInsights);
        // 3. Insights personnalisés selon le profil utilisateur
        const personalizedInsights = this.getPersonalizedInsights(userProfile, productData);
        insights.push(...personalizedInsights);
        // 4. Insights saisonniers si applicable
        const seasonalInsights = this.getSeasonalInsights();
        insights.push(...seasonalInsights);
        // 5. Insights tendances 2024
        const trendingInsights = this.getTrendingInsights(productData);
        insights.push(...trendingInsights);
        // Déduplication et tri par pertinence
        const uniqueInsights = this.deduplicateInsights(insights);
        const sortedInsights = this.sortInsightsByRelevance(uniqueInsights, productData, userProfile);
        // Limiter à 3-4 insights max pour éviter information overload
        return sortedInsights.slice(0, 4);
    }
    /**
     * Analyse les problèmes spécifiques d'un produit
     */
    analyzeProductIssues(productData) {
        const issues = [];
        // Ultra-transformation (NOVA 4)
        if (productData.breakdown?.transformation?.novaGroup === 4) {
            issues.push({
                type: 'ultra_transformation',
                severity: 'high',
                context: productData.breakdown.transformation
            });
        }
        // Additifs problématiques
        const problematicAdditives = this.detectProblematicAdditives(productData);
        if (problematicAdditives.length > 0) {
            issues.push({
                type: 'additives',
                severity: 'medium',
                context: { additives: problematicAdditives }
            });
        }
        // Index glycémique élevé
        if (productData.breakdown?.glycemic?.estimatedGI > 70) {
            issues.push({
                type: 'glycemia',
                severity: 'medium',
                context: {
                    gi: productData.breakdown.glycemic.estimatedGI,
                    category: this.getGlycemicCategory(productData.breakdown.glycemic.estimatedGI)
                }
            });
        }
        // Nutri-Score médiocre
        if (['D', 'E'].includes(productData.breakdown?.nutrition?.nutriScore?.grade)) {
            issues.push({
                type: 'poor_nutrition',
                severity: 'medium',
                context: {
                    grade: productData.breakdown.nutrition.nutriScore.grade,
                    score: productData.breakdown.nutrition.nutriScore.score
                }
            });
        }
        // Trop d'ingrédients
        if (productData.ingredients && productData.ingredients.length > 10) {
            issues.push({
                type: 'complex_formulation',
                severity: 'low',
                context: {
                    ingredientCount: productData.ingredients.length,
                    threshold: 10
                }
            });
        }
        return issues;
    }
    /**
     * Détecte les additifs problématiques
     */
    detectProblematicAdditives(productData) {
        const problematicAdditives = [
            { code: 'E471', name: 'Mono- et diglycérides', issue: 'microbiote' },
            { code: 'E472', name: 'Esters d\'acides gras', issue: 'microbiote' },
            { code: 'E249', name: 'Nitrite de potassium', issue: 'cancer' },
            { code: 'E250', name: 'Nitrite de sodium', issue: 'cancer' },
            { code: 'E621', name: 'Glutamate monosodique', issue: 'neurologique' },
            { code: 'E951', name: 'Aspartame', issue: 'microbiote' },
            { code: 'E952', name: 'Acésulfame K', issue: 'microbiote' }
        ];
        const detected = [];
        const ingredients = (productData.ingredients || []).join(' ').toUpperCase();
        problematicAdditives.forEach(additive => {
            if (ingredients.includes(additive.code)) {
                detected.push(additive);
            }
        });
        return detected;
    }
    /**
     * Obtient des insights pour les problèmes détectés
     */
    getInsightsForIssues(issues) {
        const insights = [];
        issues.forEach(issue => {
            switch (issue.type) {
                case 'ultra_transformation':
                    insights.push(this.createUltraTransformationInsight(issue.context));
                    break;
                case 'additives':
                    insights.push(this.createAdditivesInsight(issue.context));
                    break;
                case 'glycemia':
                    insights.push(this.createGlycemiaInsight(issue.context));
                    break;
                case 'poor_nutrition':
                    insights.push(this.createNutritionInsight(issue.context));
                    break;
                case 'complex_formulation':
                    insights.push(this.createComplexityInsight(issue.context));
                    break;
            }
        });
        return insights.filter(insight => insight !== null);
    }
    /**
     * Crée un insight sur l'ultra-transformation
     */
    createUltraTransformationInsight(context) {
        const ultraTransformationFacts = this.insightsDB.nutrition_insights?.ultra_transformation?.facts || [];
        if (ultraTransformationFacts.length === 0)
            return null;
        // Choisir le fait le plus pertinent
        const relevantFact = ultraTransformationFacts[0]; // Le premier est généralement le plus important
        return {
            type: 'educational',
            category: 'ultra_transformation',
            title: 'Impact de l\'ultra-transformation sur la santé',
            fact: relevantFact.fact,
            explanation: relevantFact.explanation,
            impact: relevantFact.impact,
            source: relevantFact.source,
            action_tip: "Privilégier les aliments avec moins de 5 ingrédients reconnaissables",
            relevance_score: 90,
            urgency: 'high'
        };
    }
    /**
     * Crée un insight sur les additifs
     */
    createAdditivesInsight(context) {
        const additivesFacts = this.insightsDB.nutrition_insights?.additifs?.facts || [];
        if (additivesFacts.length === 0 || !context.additives || context.additives.length === 0)
            return null;
        const detectedAdditive = context.additives[0]; // Premier additif détecté
        let relevantFact = additivesFacts.find(fact => fact.fact.includes(detectedAdditive.code) || fact.explanation.includes(detectedAdditive.code));
        if (!relevantFact) {
            relevantFact = additivesFacts[0]; // Fallback sur fait général
        }
        return {
            type: 'warning',
            category: 'additives',
            title: `Additif détecté: ${detectedAdditive.name}`,
            fact: relevantFact.fact,
            explanation: relevantFact.explanation,
            impact: relevantFact.impact,
            source: relevantFact.source,
            detected_additive: detectedAdditive,
            action_tip: "Rechercher alternatives sans émulsifiants ni conservateurs",
            relevance_score: 80,
            urgency: 'medium'
        };
    }
    /**
     * Crée un insight sur la glycémie
     */
    createGlycemiaInsight(context) {
        const glycemiaFacts = this.insightsDB.nutrition_insights?.glycemie?.facts || [];
        if (glycemiaFacts.length === 0)
            return null;
        const relevantFact = glycemiaFacts.find(fact => fact.fact.includes('index glycémique') || fact.explanation.includes('glycémique')) || glycemiaFacts[0];
        return {
            type: 'educational',
            category: 'glycemia',
            title: `Index glycémique élevé (${context.gi})`,
            fact: relevantFact.fact,
            explanation: relevantFact.explanation,
            impact: `Pic glycémique = stockage de graisses et fringales dans 2h`,
            source: relevantFact.source,
            personal_context: `Ce produit a un IG de ${context.gi} (catégorie: ${context.category})`,
            action_tip: "Associer avec fibres et protéines pour réduire l'impact",
            relevance_score: 75,
            urgency: 'medium'
        };
    }
    /**
     * Crée un insight sur la nutrition
     */
    createNutritionInsight(context) {
        return {
            type: 'nutritional',
            category: 'nutri_score',
            title: `Nutri-Score ${context.grade} - Profil nutritionnel déséquilibré`,
            fact: "Le Nutri-Score évalue la qualité nutritionnelle globale d'un aliment",
            explanation: "Un score D ou E indique un déséquilibre: trop de sucre, sel, graisses saturées et/ou pas assez de fibres, protéines, fruits et légumes",
            impact: "Consommation régulière = risques nutritionnels cumulés",
            source: "ANSES - Algorithme Nutri-Score officiel 2024",
            personal_context: `Score numérique: ${context.score}/100`,
            action_tip: "Chercher alternatives Nutri-Score A ou B dans même catégorie",
            relevance_score: 65,
            urgency: 'low'
        };
    }
    /**
     * Crée un insight sur la complexité de formulation
     */
    createComplexityInsight(context) {
        return {
            type: 'practical',
            category: 'complexity',
            title: `Formulation complexe (${context.ingredientCount} ingrédients)`,
            fact: "Plus un produit contient d'ingrédients, plus il est transformé",
            explanation: "Règle empirique: si vous ne pouvez pas reproduire le produit dans votre cuisine, c'est qu'il est ultra-transformé",
            impact: "Interactions entre additifs non étudiées, effet cocktail possible",
            source: "Clean Label Research 2024",
            action_tip: "Privilégier produits à liste d'ingrédients courte et compréhensible",
            relevance_score: 50,
            urgency: 'low'
        };
    }
    /**
     * Obtient des insights de catégorie
     */
    getCategoryInsights(productData) {
        const insights = [];
        const category = this.categorizeProduct(productData);
        // Insights spécifiques selon la catégorie
        switch (category) {
            case 'dairy':
                insights.push(this.createMicrobiomeInsight());
                break;
            case 'beverages':
                insights.push(this.createHydrationInsight());
                break;
            case 'snacks':
                insights.push(this.createSnackingInsight());
                break;
            case 'breakfast':
                insights.push(this.createMealTimingInsight());
                break;
        }
        return insights.filter(insight => insight !== null);
    }
    /**
     * Crée un insight sur le microbiome (produits laitiers)
     */
    createMicrobiomeInsight() {
        const microbiomeFacts = this.insightsDB.nutrition_insights?.microbiote?.facts || [];
        if (microbiomeFacts.length === 0)
            return null;
        const relevantFact = microbiomeFacts[0];
        return {
            type: 'educational',
            category: 'microbiome',
            title: 'Impact sur votre microbiote intestinal',
            fact: relevantFact.fact,
            explanation: relevantFact.explanation,
            impact: relevantFact.impact,
            source: relevantFact.source,
            action_tip: "Privilégier produits fermentés traditionnels et diversité alimentaire",
            relevance_score: 70,
            urgency: 'medium'
        };
    }
    /**
     * Obtient des insights personnalisés
     */
    getPersonalizedInsights(userProfile, productData) {
        const insights = [];
        const triggers = this.insightsDB.personalization_triggers || {};
        // Analyser les mots-clés du profil utilisateur
        const userInterests = this.extractUserInterests(userProfile);
        userInterests.forEach(interest => {
            if (triggers[interest]) {
                const personalizedInsight = this.createPersonalizedInsight(interest, triggers[interest], productData);
                if (personalizedInsight)
                    insights.push(personalizedInsight);
            }
        });
        return insights;
    }
    /**
     * Extrait les centres d'intérêt utilisateur
     */
    extractUserInterests(userProfile) {
        const interests = [];
        // Analyser les objectifs/préoccupations utilisateur
        if (userProfile.health_goals) {
            if (userProfile.health_goals.includes('diabète') || userProfile.health_goals.includes('glycémie')) {
                interests.push('diabetes_risk');
            }
            if (userProfile.health_goals.includes('poids') || userProfile.health_goals.includes('minceur')) {
                interests.push('weight_management');
            }
            if (userProfile.health_goals.includes('digestion') || userProfile.health_goals.includes('ballonnements')) {
                interests.push('digestive_issues');
            }
        }
        // Analyser priorités
        if (userProfile.priorities?.includes('environnement')) {
            interests.push('environmental_concern');
        }
        return interests;
    }
    /**
     * Crée un insight personnalisé
     */
    createPersonalizedInsight(interest, triggerData, productData) {
        const specificInsights = triggerData.specific_insights || [];
        if (specificInsights.length === 0)
            return null;
        return {
            type: 'personalized',
            category: interest,
            title: `Conseil personnalisé: ${this.getInterestTitle(interest)}`,
            fact: specificInsights[0],
            explanation: `Basé sur votre profil et ce produit spécifique`,
            impact: "Optimisation de vos objectifs santé/environnement",
            source: "Personnalisation ECOLOJIA",
            action_tip: specificInsights[1] || "Adapter vos choix selon vos priorités",
            relevance_score: 85,
            urgency: 'medium',
            personalized: true
        };
    }
    /**
     * Obtient des insights saisonniers
     */
    getSeasonalInsights() {
        const currentMonth = new Date().getMonth();
        const seasons = {
            spring: [2, 3, 4], // Mars, Avril, Mai
            summer: [5, 6, 7], // Juin, Juillet, Août
            autumn: [8, 9, 10], // Sept, Oct, Nov
            winter: [11, 0, 1] // Déc, Jan, Fév
        };
        let currentSeason = 'spring';
        for (const [season, months] of Object.entries(seasons)) {
            if (months.includes(currentMonth)) {
                currentSeason = season;
                break;
            }
        }
        const seasonalData = this.insightsDB.seasonal_insights?.[currentSeason];
        if (!seasonalData)
            return [];
        return [{
                type: 'seasonal',
                category: 'seasonal_nutrition',
                title: `Conseil nutrition ${this.getSeasonName(currentSeason)}`,
                fact: seasonalData.insight,
                explanation: `Focus: ${seasonalData.focus}`,
                impact: "Optimisation selon la saison",
                source: "Chronobiologie nutritionnelle 2024",
                key_foods: seasonalData.key_foods,
                action_tip: `Privilégier: ${seasonalData.key_foods}`,
                relevance_score: 45,
                urgency: 'low',
                seasonal: true
            }];
    }
    /**
     * Obtient des insights tendances
     */
    getTrendingInsights(productData) {
        const trendingTopics = this.insightsDB.trending_topics_2024 || [];
        if (trendingTopics.length === 0)
            return [];
        // Choisir un trending topic pertinent
        const relevantTrend = trendingTopics[Math.floor(Math.random() * trendingTopics.length)];
        return [{
                type: 'trending',
                category: 'science_2024',
                title: `Recherche 2024: ${relevantTrend.topic}`,
                fact: relevantTrend.insight,
                explanation: "Dernières découvertes scientifiques",
                impact: "Nouvelles perspectives santé",
                source: relevantTrend.source,
                action_tip: "Intégrer ces nouvelles connaissances dans vos choix",
                relevance_score: 40,
                urgency: 'low',
                trending: true
            }];
    }
    /**
     * Déduplique les insights similaires
     */
    deduplicateInsights(insights) {
        const seen = new Set();
        return insights.filter(insight => {
            const key = `${insight.category}-${insight.title}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    /**
     * Trie les insights par pertinence
     */
    sortInsightsByRelevance(insights, productData, userProfile) {
        return insights.sort((a, b) => {
            // Priorité aux insights personnalisés
            if (a.personalized && !b.personalized)
                return -1;
            if (b.personalized && !a.personalized)
                return 1;
            // Priorité à l'urgence
            const urgencyOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            const urgencyA = urgencyOrder[a.urgency] || 0;
            const urgencyB = urgencyOrder[b.urgency] || 0;
            if (urgencyB !== urgencyA) {
                return urgencyB - urgencyA;
            }
            // Puis par score de pertinence
            return (b.relevance_score || 0) - (a.relevance_score || 0);
        });
    }
    /**
     * Helpers
     */
    categorizeProduct(productData) {
        const name = (productData.name || '').toLowerCase();
        if (/yaourt|lait|fromage|kéfir|skyr/.test(name))
            return 'dairy';
        if (/jus|boisson|soda|eau/.test(name))
            return 'beverages';
        if (/biscuit|chips|barr|snack/.test(name))
            return 'snacks';
        if (/céréales|muesli|granola/.test(name))
            return 'breakfast';
        return 'general';
    }
    getGlycemicCategory(gi) {
        if (gi < 55)
            return 'bas';
        if (gi < 70)
            return 'modéré';
        return 'élevé';
    }
    getInterestTitle(interest) {
        const titles = {
            'diabetes_risk': 'Gestion glycémique',
            'weight_management': 'Gestion du poids',
            'digestive_issues': 'Santé digestive',
            'environmental_concern': 'Impact environnemental'
        };
        return titles[interest] || interest;
    }
    getSeasonName(season) {
        const names = {
            'spring': 'printemps',
            'summer': 'été',
            'autumn': 'automne',
            'winter': 'hiver'
        };
        return names[season] || season;
    }
    /**
     * API publique : générer insights pour un produit
     */
    async getInsightsForProduct(productData, userProfile = {}) {
        try {
            const insights = await this.generateInsights(productData, userProfile);
            return insights.map(insight => ({
                type: insight.type,
                title: insight.title,
                fact: insight.fact,
                explanation: insight.explanation,
                impact: insight.impact,
                source: insight.source,
                action_tip: insight.action_tip,
                urgency: insight.urgency || 'low',
                confidence: insight.source ? 'high' : 'medium'
            }));
        }
        catch (error) {
            console.error('Error generating insights:', error);
            return [];
        }
    }
}
module.exports = new InsightsGenerator();

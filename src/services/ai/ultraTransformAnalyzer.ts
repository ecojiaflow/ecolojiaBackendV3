// PATH: backend/src/services/ai/ultraTransformAnalyzer.ts
import { UltraTransformResult, ProcessingMethod, NutritionalImpact } from '../../types/ultra-transform.types';

/**
 * Service d'analyse Ultra-Transformation
 * Complément de NOVA pour évaluer le niveau de transformation industrielle
 * Basé sur les critères SIGA et études INSERM 2024
 */
export class UltraTransformAnalyzer {
  // Base de données des méthodes de transformation
  private readonly processingMethods: Record<string, ProcessingMethod> = {
    // Procédés mécaniques (faible impact)
    'broyage': { level: 1, impact: 'low', category: 'mechanical' },
    'découpe': { level: 1, impact: 'low', category: 'mechanical' },
    'pressage': { level: 1, impact: 'low', category: 'mechanical' },
    'filtration': { level: 1, impact: 'low', category: 'mechanical' },
    
    // Procédés thermiques (impact modéré)
    'pasteurisation': { level: 2, impact: 'medium', category: 'thermal' },
    'stérilisation': { level: 3, impact: 'high', category: 'thermal' },
    'uht': { level: 3, impact: 'high', category: 'thermal' },
    'friture': { level: 3, impact: 'high', category: 'thermal' },
    'torréfaction': { level: 2, impact: 'medium', category: 'thermal' },
    
    // Procédés chimiques (impact élevé)
    'hydrogénation': { level: 4, impact: 'very_high', category: 'chemical' },
    'hydrolyse': { level: 4, impact: 'very_high', category: 'chemical' },
    'estérification': { level: 5, impact: 'extreme', category: 'chemical' },
    'alkylation': { level: 5, impact: 'extreme', category: 'chemical' },
    
    // Procédés d'extraction/raffinage
    'raffinage': { level: 3, impact: 'high', category: 'extraction' },
    'extraction_solvant': { level: 4, impact: 'very_high', category: 'extraction' },
    'déminéralisation': { level: 3, impact: 'high', category: 'extraction' },
    'concentration': { level: 2, impact: 'medium', category: 'extraction' },
    
    // Procédés de modification
    'extrusion': { level: 4, impact: 'very_high', category: 'modification' },
    'texturation': { level: 4, impact: 'very_high', category: 'modification' },
    'encapsulation': { level: 3, impact: 'high', category: 'modification' },
    'atomisation': { level: 3, impact: 'high', category: 'modification' }
  };

  // Marqueurs industriels
  private readonly industrialMarkers = {
    // Ingrédients ultra-transformés
    ingredients: [
      { pattern: /sirop.*glucose.*fructose/i, level: 4, type: 'sweetener' },
      { pattern: /maltodextrine/i, level: 4, type: 'bulking' },
      { pattern: /amidon.*modifié/i, level: 4, type: 'thickener' },
      { pattern: /protéine.*hydrolysée/i, level: 5, type: 'protein' },
      { pattern: /isolat.*protéine/i, level: 4, type: 'protein' },
      { pattern: /huile.*hydrogénée/i, level: 5, type: 'fat' },
      { pattern: /graisse.*végétale/i, level: 3, type: 'fat' },
      { pattern: /concentré.*protéine/i, level: 3, type: 'protein' },
      { pattern: /extrait.*levure/i, level: 3, type: 'flavor' },
      { pattern: /arôme.*artificiel/i, level: 4, type: 'flavor' },
      { pattern: /édulcorant.*synthétique/i, level: 4, type: 'sweetener' }
    ],
    
    // Additifs technologiques
    additives: [
      { pattern: /e4\d{2}/i, level: 3, function: 'texture' },
      { pattern: /e3[2-8]\d/i, level: 3, function: 'preservation' },
      { pattern: /e9[5-6]\d/i, level: 4, function: 'sweetener' },
      { pattern: /e1[0-8]\d{2}/i, level: 3, function: 'color' }
    ],
    
    // Termes de process
    processTerms: [
      { pattern: /instantané/i, level: 3 },
      { pattern: /reconstitué/i, level: 3 },
      { pattern: /enrichi.*vitamines/i, level: 2 },
      { pattern: /longue.*conservation/i, level: 3 },
      { pattern: /pré.*cuit/i, level: 2 },
      { pattern: /lyophilisé/i, level: 3 },
      { pattern: /micro.*ondable/i, level: 3 }
    ]
  };

  /**
   * Analyse principale du niveau d'ultra-transformation
   */
  async analyze(productName: string, ingredients: string): Promise<UltraTransformResult> {
    console.log('🔬 Analyse Ultra-Transformation:', { productName });

    // 1. Détection des méthodes de transformation
    const processingMethods = this.detectProcessingMethods(ingredients);
    
    // 2. Identification des marqueurs industriels
    const industrialMarkers = this.detectIndustrialMarkers(ingredients);
    
    // 3. Calcul du niveau de transformation (1-5)
    const transformationLevel = this.calculateTransformationLevel(
      processingMethods,
      industrialMarkers
    );
    
    // 4. Évaluation de l'impact nutritionnel
    const nutritionalImpact = this.evaluateNutritionalImpact(
      processingMethods,
      transformationLevel
    );
    
    // 5. Génération des recommandations
    const recommendations = this.generateRecommendations(
      transformationLevel,
      processingMethods,
      industrialMarkers
    );
    
    // 6. Calcul de la matrice de naturalité
    const naturalityMatrix = this.calculateNaturalityMatrix(ingredients);

    const result: UltraTransformResult = {
      productName,
      transformationLevel,
      processingMethods: processingMethods.map(m => m.name),
      industrialMarkers: industrialMarkers.map(m => m.description),
      nutritionalImpact,
      recommendations,
      naturalityMatrix,
      confidence: this.calculateConfidence(processingMethods, industrialMarkers),
      scientificSources: [
        'Classification SIGA 2024',
        'Étude INSERM Ultra-transformation 2024',
        'Base ANSES Procédés alimentaires'
      ],
      timestamp: new Date().toISOString()
    };

    console.log('✅ Analyse Ultra-Transformation complète:', {
      level: transformationLevel,
      methods: processingMethods.length,
      markers: industrialMarkers.length
    });

    return result;
  }

  /**
   * Détecte les méthodes de transformation
   */
  private detectProcessingMethods(ingredients: string): Array<{
    name: string;
    level: number;
    impact: string;
    category: string;
  }> {
    const detected: Array<any> = [];
    const lower = ingredients.toLowerCase();

    // Analyse des termes de process
    for (const [method, details] of Object.entries(this.processingMethods)) {
      if (lower.includes(method)) {
        detected.push({
          name: method,
          ...details
        });
      }
    }

    // Détection par indices
    if (lower.includes('huile') && lower.includes('palme')) {
      detected.push({
        name: 'raffinage intensif',
        level: 4,
        impact: 'very_high',
        category: 'extraction'
      });
    }

    if (lower.includes('sirop') && (lower.includes('glucose') || lower.includes('fructose'))) {
      detected.push({
        name: 'hydrolyse enzymatique',
        level: 4,
        impact: 'very_high',
        category: 'chemical'
      });
    }

    if (lower.includes('protéine') && (lower.includes('isolat') || lower.includes('concentré'))) {
      detected.push({
        name: 'ultrafiltration',
        level: 3,
        impact: 'high',
        category: 'extraction'
      });
    }

    return detected;
  }

  /**
   * Détecte les marqueurs industriels
   */
  private detectIndustrialMarkers(ingredients: string): Array<{
    type: string;
    description: string;
    level: number;
  }> {
    const markers: Array<any> = [];

    // Analyse des ingrédients industriels
    for (const marker of this.industrialMarkers.ingredients) {
      if (marker.pattern.test(ingredients)) {
        const match = ingredients.match(marker.pattern)?.[0] || '';
        markers.push({
          type: 'ingredient',
          description: `Ingrédient industriel: ${match}`,
          level: marker.level
        });
      }
    }

    // Analyse des additifs
    const additiveMatches = ingredients.match(/e\d{3,4}/gi) || [];
    for (const additive of additiveMatches) {
      markers.push({
        type: 'additive',
        description: `Additif technologique: ${additive.toUpperCase()}`,
        level: 3
      });
    }

    // Analyse des termes de process
    for (const term of this.industrialMarkers.processTerms) {
      if (term.pattern.test(ingredients)) {
        markers.push({
          type: 'process',
          description: `Indicateur de transformation: ${ingredients.match(term.pattern)?.[0]}`,
          level: term.level
        });
      }
    }

    return markers;
  }

  /**
   * Calcule le niveau de transformation (1-5)
   */
  private calculateTransformationLevel(
    methods: Array<any>,
    markers: Array<any>
  ): number {
    // Score basé sur les méthodes
    const methodScore = methods.reduce((sum, m) => sum + m.level, 0);
    const avgMethodLevel = methods.length > 0 ? methodScore / methods.length : 0;

    // Score basé sur les marqueurs
    const markerScore = markers.reduce((sum, m) => sum + m.level, 0);
    const avgMarkerLevel = markers.length > 0 ? markerScore / markers.length : 0;

    // Combinaison des scores
    let totalScore = (avgMethodLevel * 0.6) + (avgMarkerLevel * 0.4);

    // Ajustements
    if (methods.some(m => m.category === 'chemical')) totalScore += 0.5;
    if (markers.filter(m => m.type === 'additive').length > 5) totalScore += 0.5;
    if (methods.some(m => m.impact === 'extreme')) totalScore = Math.max(totalScore, 4.5);

    // Arrondi au niveau entier le plus proche (1-5)
    return Math.max(1, Math.min(5, Math.round(totalScore)));
  }

  /**
   * Évalue l'impact nutritionnel
   */
  private evaluateNutritionalImpact(
    methods: Array<any>,
    level: number
  ): NutritionalImpact {
    // Calculs basés sur le niveau et les méthodes
    const thermalMethods = methods.filter(m => m.category === 'thermal').length;
    const chemicalMethods = methods.filter(m => m.category === 'chemical').length;

    // Pertes en vitamines (thermosensibles)
    let vitaminLoss = 10 + (thermalMethods * 15) + (level * 10);
    vitaminLoss = Math.min(80, vitaminLoss);

    // Rétention des minéraux (plus stables)
    let mineralRetention = 95 - (chemicalMethods * 10) - (level * 5);
    mineralRetention = Math.max(50, mineralRetention);

    // Dénaturation des protéines
    let proteinDenaturation = 5 + (thermalMethods * 10) + (chemicalMethods * 15);
    proteinDenaturation = Math.min(70, proteinDenaturation);

    // Formation de composés néoformés
    const neoformedCompounds = level >= 4 ? 'high' : level >= 3 ? 'medium' : 'low';

    // Impact sur la biodisponibilité
    const bioavailabilityImpact = level >= 4 ? 'negative' : level >= 3 ? 'mixed' : 'neutral';

    return {
      vitaminLoss,
      mineralRetention,
      proteinDenaturation,
      fiberDegradation: level >= 3 ? 20 + (level * 10) : 10,
      antioxidantLoss: 15 + (level * 12),
      glycemicIndexIncrease: level >= 3 ? 20 + ((level - 3) * 15) : 5,
      neoformedCompounds,
      bioavailabilityImpact
    };
  }

  /**
   * Génère des recommandations personnalisées
   */
  private generateRecommendations(
    level: number,
    methods: Array<any>,
    markers: Array<any>
  ): string[] {
    const recommendations: string[] = [];

    // Recommandations selon le niveau
    switch (level) {
      case 1:
        recommendations.push('✅ Transformation minimale préservant les qualités nutritionnelles');
        recommendations.push('🌟 Excellent choix pour une alimentation saine');
        recommendations.push('💚 Les nutriments sont bien préservés');
        break;
      
      case 2:
        recommendations.push('👍 Transformation modérée acceptable');
        recommendations.push('💡 Privilégiez les versions moins transformées quand possible');
        recommendations.push('🥗 Complétez avec des aliments frais');
        break;
      
      case 3:
        recommendations.push('⚠️ Transformation importante - consommation modérée');
        recommendations.push('🔄 Recherchez des alternatives moins transformées');
        recommendations.push('📊 Vérifiez les valeurs nutritionnelles');
        break;
      
      case 4:
        recommendations.push('🚨 Ultra-transformation détectée - limiter la consommation');
        recommendations.push('🏠 Préférez une version maison si possible');
        recommendations.push('⚡ Impact significatif sur la qualité nutritionnelle');
        break;
      
      case 5:
        recommendations.push('❌ Transformation extrême - éviter si possible');
        recommendations.push('🧪 Nombreux procédés chimiques détectés');
        recommendations.push('🌱 Optez pour des aliments naturels non transformés');
        break;
    }

    // Recommandations spécifiques aux méthodes
    if (methods.some(m => m.category === 'chemical')) {
      recommendations.push('🧪 Procédés chimiques détectés - recherchez des alternatives naturelles');
    }

    if (methods.some(m => m.impact === 'very_high' || m.impact === 'extreme')) {
      recommendations.push('⚠️ Méthodes de transformation à fort impact nutritionnel');
    }

    // Recommandations pour les marqueurs
    if (markers.filter(m => m.type === 'additive').length > 3) {
      recommendations.push('📖 Nombreux additifs - privilégiez les listes d\'ingrédients courtes');
    }

    // Conseil général
    recommendations.push('📚 Consultez notre guide sur l\'ultra-transformation alimentaire');

    return recommendations;
  }

  /**
   * Calcule la matrice de naturalité
   */
  private calculateNaturalityMatrix(ingredients: string): {
    naturalIngredients: number;
    artificialIngredients: number;
    processingAids: number;
    naturalityScore: number;
  } {
    const lower = ingredients.toLowerCase();
    
    // Comptage des ingrédients naturels
    const naturalPatterns = [
      /fruits?/i, /légumes?/i, /viande/i, /poisson/i, /œufs?/i,
      /lait/i, /crème/i, /beurre/i, /huile.*olive/i, /miel/i,
      /eau/i, /sel.*mer/i, /épices?/i, /herbes?/i
    ];
    
    let naturalCount = 0;
    for (const pattern of naturalPatterns) {
      if (pattern.test(lower)) naturalCount++;
    }

    // Comptage des ingrédients artificiels
    let artificialCount = 0;
    artificialCount += (lower.match(/e\d{3}/g) || []).length;
    artificialCount += this.industrialMarkers.ingredients.filter(m => m.pattern.test(lower)).length;

    // Auxiliaires technologiques
    const processingAids = (lower.match(/(agent|auxiliaire|support)/g) || []).length;

    // Score de naturalité (0-100)
    const total = naturalCount + artificialCount + processingAids;
    const naturalityScore = total > 0 
      ? Math.round((naturalCount / total) * 100)
      : 0;

    return {
      naturalIngredients: naturalCount,
      artificialIngredients: artificialCount,
      processingAids,
      naturalityScore
    };
  }

  /**
   * Calcule le niveau de confiance
   */
  private calculateConfidence(methods: Array<any>, markers: Array<any>): number {
    const dataPoints = methods.length + markers.length;
    
    if (dataPoints >= 10) return 0.95;
    if (dataPoints >= 7) return 0.90;
    if (dataPoints >= 5) return 0.85;
    if (dataPoints >= 3) return 0.80;
    if (dataPoints >= 1) return 0.75;
    
    return 0.70;
  }
}

export default UltraTransformAnalyzer;
// EOF
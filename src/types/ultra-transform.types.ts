// PATH: backend/src/types/ultra-transform.types.ts

/**
 * Résultat de l'analyse Ultra-Transformation
 */
export interface UltraTransformResult {
  productName: string;
  transformationLevel: number;           // 1-5 (1=minimal, 5=extrême)
  processingMethods: string[];          // Méthodes de transformation détectées
  industrialMarkers: string[];          // Marqueurs industriels identifiés
  nutritionalImpact: NutritionalImpact;
  recommendations: string[];
  naturalityMatrix: NaturalityMatrix;
  confidence: number;                   // 0-1
  scientificSources: string[];
  timestamp: string;
}

/**
 * Impact nutritionnel de la transformation
 */
export interface NutritionalImpact {
  vitaminLoss: number;                  // % perte vitamines
  mineralRetention: number;             // % rétention minéraux
  proteinDenaturation: number;          // % dénaturation protéines
  fiberDegradation: number;             // % dégradation fibres
  antioxidantLoss: number;              // % perte antioxydants
  glycemicIndexIncrease: number;        // % augmentation IG
  neoformedCompounds: 'low' | 'medium' | 'high';
  bioavailabilityImpact: 'positive' | 'neutral' | 'mixed' | 'negative';
}

/**
 * Matrice de naturalité
 */
export interface NaturalityMatrix {
  naturalIngredients: number;           // Nombre d'ingrédients naturels
  artificialIngredients: number;        // Nombre d'ingrédients artificiels
  processingAids: number;               // Auxiliaires technologiques
  naturalityScore: number;              // Score global 0-100
}

/**
 * Méthode de transformation
 */
export interface ProcessingMethod {
  level: number;                        // 1-5
  impact: 'low' | 'medium' | 'high' | 'very_high' | 'extreme';
  category: 'mechanical' | 'thermal' | 'chemical' | 'extraction' | 'modification';
}

/**
 * Détails de transformation par catégorie
 */
export interface TransformationDetails {
  mechanical: {
    methods: string[];
    impactLevel: number;
  };
  thermal: {
    methods: string[];
    temperatureRange?: string;
    duration?: string;
    impactLevel: number;
  };
  chemical: {
    methods: string[];
    reagents?: string[];
    impactLevel: number;
  };
  biological: {
    methods: string[];
    microorganisms?: string[];
    impactLevel: number;
  };
}

/**
 * Comparaison avec alternatives
 */
export interface AlternativeComparison {
  currentProduct: {
    name: string;
    transformationLevel: number;
    nutritionalLoss: number;
  };
  alternatives: Array<{
    name: string;
    transformationLevel: number;
    nutritionalRetention: number;
    availability: 'common' | 'specialty' | 'homemade';
    priceRatio: number;  // vs produit actuel
  }>;
}

/**
 * Rapport complet d'ultra-transformation
 */
export interface UltraTransformReport {
  summary: UltraTransformResult;
  details: TransformationDetails;
  comparison?: AlternativeComparison;
  educationalContent: {
    whatIsUltraProcessing: string;
    whyItMatters: string;
    howToIdentify: string[];
    healthImpacts: string[];
  };
  certifications?: {
    hasCleanLabel: boolean;
    hasMinimalProcessing: boolean;
    certificationDetails?: string[];
  };
}

// Export pour compatibilité
export default {
  // Types principaux disponibles
};
// EOF
// backend/src/types/scientific-analysis.types.ts

/**
 * 🔬 Types pour l'analyse scientifique révolutionnaire ECOLOJIA
 */

// Classification NOVA
export interface NovaClassification {
  novaGroup: 1 | 2 | 3 | 4;
  groupInfo: {
    name: string;
    description: string;
    examples: string[];
  };
  confidence: number;
  scientificSource: string;
  healthImpact: {
    level: 'positive' | 'neutral' | 'moderate' | 'high_risk';
    description: string;
    risks: string[];
    benefits: string[];
  };
  recommendations: {
    action: 'enjoy' | 'moderate' | 'replace';
    urgency: 'low' | 'medium' | 'high';
    message: string;
    alternatives: string[];
    educationalTip: string;
  };
}

// Analyse additifs EFSA
export interface EFSAAdditivesAnalysis {
  total: number;
  byRiskLevel: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  microbiomeDisruptors: Array<{
    code: string;
    name: string;
    impact: 'negative_confirmed' | 'negative_suspected' | 'unknown';
  }>;
  endocrineDisruptors: Array<{
    code: string;
    name: string;
  }>;
  concerns: Array<{
    code: string;
    name: string;
    concern: string;
  }>;
  alternatives: string[];
  overallRisk: 'low' | 'medium' | 'high';
  confidence?: number;
}

// Alternatives naturelles
export interface NaturalAlternative {
  name: string;
  why_better: string;
  difficulty: 'facile' | 'moyen' | 'avancé';
  time: string;
  cost_comparison: string;
  nutritional_advantage: string;
  environmental_benefit: string;
  sources: string[];
  type: 'substitute' | 'diy' | 'category_specific';
  relevance_score?: number;
  confidence: 'high' | 'medium' | 'low';
  recipe_link?: string;
  usage_guide?: string;
}

// Insights éducatifs
export interface EducationalInsight {
  type: 'classification' | 'additives' | 'microbiome' | 'alternatives' | 'personalized';
  title: string;
  urgency: 'info' | 'medium' | 'high';
  content: {
    explanation?: string;
    healthImpact?: string | string[];
    scientificEvidence?: any;
    actionableAdvice?: string;
    [key: string]: any;
  };
  sources: string[];
  learningValue: number; // Score /10
}

export interface MicroLearningModule {
  title: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  duration: string;
  keyPoints: string[];
  actionableAdvice: string;
  quiz?: Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
  experiment?: string;
  personalStory?: string;
  deepDive?: string;
}

export interface EducationalContent {
  insights: EducationalInsight[];
  microLearning: MicroLearningModule[];
  scientificSources: any[];
  takeHomeMessage: {
    message: string;
    action: string;
    impact: string;
  };
}

// Score révolutionnaire
export interface RevolutionaryScore {
  overall: number;
  breakdown: {
    base: number;
    novaPenalty: number;
    additivesPenalty: number;
    microbiomePenalty: number;
    endocrinePenalty: number;
    alternativesBonus: number;
    naturalBonus: number;
  };
  category: {
    level: 'excellent' | 'good' | 'moderate' | 'poor';
    color: string;
    message: string;
  };
  comparison: {
    vsYuka: {
      difference: number;
      message: string;
    };
    vsNutriScore?: {
      equivalent: string;
      message: string;
    };
  };
}

// Alertes intelligentes
export interface SmartAlert {
  type: 'ultra_processing' | 'high_risk_additives' | 'microbiome_disruptors' | 'endocrine_disruptors';
  severity: 'info' | 'medium' | 'high';
  title: string;
  message: string;
  healthImpact?: string;
  action: string;
}

// Recommandations actionnables
export interface ActionableRecommendation {
  priority: 'info' | 'medium' | 'high';
  category: 'replacement' | 'transition' | 'education' | 'prevention';
  title: string;
  action: string;
  benefit: string;
  timeline: string;
  difficulty: 'facile' | 'moyen' | 'avancé';
}

// Analyse scientifique complète
export interface ScientificAnalysis {
  nova: NovaClassification;
  additives: EFSAAdditivesAnalysis;
  ingredients: string[];
  eCodes: string[];
}

// Profil utilisateur
export interface UserProfile {
  healthGoals?: ('weight_loss' | 'digestive_health' | 'energy' | 'skin_health' | 'general_wellness')[];
  allergies?: string[];
  budget_conscious?: boolean;
  time_constrained?: boolean;
  environmental_priority?: boolean;
  dietary_restrictions?: ('vegetarian' | 'vegan' | 'gluten_free' | 'lactose_free')[];
}

// Réponse analyse révolutionnaire complète
export interface RevolutionaryAnalysisResponse {
  success: boolean;
  productId: string;
  productSlug: string;
  productName: string;
  
  // Analyse de base (OCR + Score classique)
  analysis: {
    ocr_confidence: string;
    ingredients_detected: number;
    certifications_found: string[];
    eco_score: any;
    raw_texts: string[];
  };

  // Analyse révolutionnaire
  revolutionaryAnalysis: {
    score: RevolutionaryScore;
    scientificAnalysis: ScientificAnalysis;
    alternatives: {
      natural: NaturalAlternative[];
      count: number;
      topRecommendation: NaturalAlternative | null;
    };
    education: {
      insights: EducationalInsight[];
      takeHomeMessage: {
        message: string;
        action: string;
        impact: string;
      };
    };
    alerts: SmartAlert[];
    recommendations: ActionableRecommendation[];
  };

  // Métadonnées
  metadata: {
    analysisVersion: string;
    confidence: number;
    sources: string[];
    processingTime?: number;
  };

  redirect_url: string;
  warning?: string; // En cas de fallback
}

// Types pour les moteurs IA
export interface ProductAnalysisInput {
  ingredients: string[];
  name: string;
  category?: string;
  barcode?: string;
  eCodes?: string[];
}

export interface AlternativesEngineInput {
  name: string;
  category: string;
  ingredients: string[];
  breakdown: {
    transformation: { novaGroup: number };
    additives: EFSAAdditivesAnalysis;
  };
}

export interface InsightsEngineInput {
  novaGroup: number;
  additives: string[];
  ingredients: string[];
  category: string;
  glycemicIndex?: number;
}

// Export types pour utilisation dans les contrôleurs
export type {
  NovaClassification,
  EFSAAdditivesAnalysis,
  NaturalAlternative,
  EducationalInsight,
  EducationalContent,
  RevolutionaryScore,
  SmartAlert,
  ActionableRecommendation,
  ScientificAnalysis,
  UserProfile,
  RevolutionaryAnalysisResponse,
  ProductAnalysisInput,
  AlternativesEngineInput,
  InsightsEngineInput
};
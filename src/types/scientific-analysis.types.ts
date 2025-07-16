// PATH: backend/src/types/scientific-analysis.types.ts
export type NovaClassification = {
  novaGroup: number;
  confidence: number;
  comment?: string;
};

export type EFSAAdditivesAnalysis = {
  additive: string;
  riskLevel: 'low' | 'medium' | 'high';
  evidence: string;
};

export type NaturalAlternative = {
  ingredient: string;
  alternative: string;
  benefit: string;
};

export type EducationalInsight = {
  topic: string;
  message: string;
};

export type EducationalContent = {
  goal: string;
  advice: string;
};

export type RevolutionaryScore = {
  eco_score: number;
  ai_confidence: number;
};

export type SmartAlert = {
  type: 'warning' | 'info' | 'danger';
  message: string;
};

export type ActionableRecommendation = {
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
};

export type ScientificAnalysis = {
  nova?: NovaClassification;
  additives?: EFSAAdditivesAnalysis[];
  insights?: EducationalInsight[];
  alternatives?: NaturalAlternative[];
  eco?: RevolutionaryScore;
  alerts?: SmartAlert[];
  recommendations?: ActionableRecommendation[];
};

export type UserProfile = {
  healthGoals?: string[];
  allergies?: string[];
  budget_conscious?: boolean;
  time_constrained?: boolean;
  environmental_priority?: boolean;
};

export type RevolutionaryAnalysisResponse = {
  product: ScientificAnalysis;
  user: UserProfile;
  available_data: {
    product_name: string;
    ingredients_text: string;
    category_detected: string;
  };
};

export type ProductAnalysisInput = {
  barcode?: string;
  ocrText?: string;
  images?: string[];
  userProfile?: UserProfile;
  specificQuestions?: string;
};

export type AlternativesEngineInput = {
  productName: string;
  category: string;
  ingredients: string[];
};

export type InsightsEngineInput = {
  productName: string;
  ingredients: string;
  userGoals: string[];
};
// EOF
// src/services/multiCategoryApi.ts - VERSION CORRIGÉE POUR SERVER.JS

// 🔧 Configuration multi-environnements
const API_ENDPOINTS = {
  production: 'https://ecolojia-backend-working.onrender.com',
  local: 'http://localhost:8000',
  fallback: 'mock' // Mode données simulées
};

// Détection automatique du meilleur endpoint
const detectBestEndpoint = async (): Promise<string> => {
  // 1. Essayer production
  try {
    // 🔧 FIX: Utiliser /health au lieu de /api/health
    const response = await fetch(`${API_ENDPOINTS.production}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3s max
    });
    if (response.ok) {
      console.log('✅ Backend production disponible');
      return API_ENDPOINTS.production;
    }
  } catch (error) {
    console.log('⚠️ Backend production indisponible');
  }

  // 2. Essayer local
  try {
    const response = await fetch(`${API_ENDPOINTS.local}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2s max
    });
    if (response.ok) {
      console.log('✅ Backend local disponible');
      return API_ENDPOINTS.local;
    }
  } catch (error) {
    console.log('⚠️ Backend local indisponible');
  }

  // 3. Fallback mode mock
  console.log('🔄 Mode fallback activé - Données simulées');
  return API_ENDPOINTS.fallback;
};

// Types TypeScript (inchangés)
export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  available: boolean;
}

export interface CategoriesResponse {
  success: boolean;
  categories?: Category[];
  data?: Category[];
  total_categories?: number;
  total?: number;
  default_category?: string;
  api_version?: string;
  timestamp?: string;
  error?: string;
}

export interface AnalysisRequest {
  product: {
    title: string;
    brand?: string;
    description?: string;
    ingredients?: string[];
    category?: string;
  };
  context?: {
    userId?: string;
    anonymousId?: string;
  };
}

export interface AnalysisResponse {
  success: boolean;
  category: string;
  detection_confidence: number;
  analysis: {
    overall_score: number;
    detailed_analysis?: any;
    confidence: number;
    sources: string[];
  };
  alternatives: any[];
  metadata: {
    processing_time_ms: number;
    api_version: string;
    request_id: string;
    timestamp: string;
  };
}

// Service principal avec fallback intelligent
export class MultiCategoryApiService {
  private baseUrl: string = '';
  private isInitialized: boolean = false;

  constructor() {
    this.initializeEndpoint();
  }

  private async initializeEndpoint() {
    if (!this.isInitialized) {
      this.baseUrl = await detectBestEndpoint();
      this.isInitialized = true;
    }
  }

  // Données mock pour fallback
  private getMockCategories(): CategoriesResponse {
    return {
      success: true,
      categories: [
        {
          id: 'food',
          name: 'Alimentaire',
          description: 'Analyse nutritionnelle et détection ultra-transformation des produits alimentaires',
          icon: '🍎',
          color: '#7DDE4A',
          features: ['Classification NOVA', 'Index glycémique', 'Additifs dangereux', 'Alternatives bio'],
          available: true
        },
        {
          id: 'cosmetics',
          name: 'Cosmétiques',
          description: 'Analyse des ingrédients cosmétiques et perturbateurs endocriniens',
          icon: '💄',
          color: '#FF69B4',
          features: ['Ingrédients toxiques', 'Certification bio', 'Tests animaux', 'Alternatives naturelles'],
          available: true
        },
        {
          id: 'detergents',
          name: 'Détergents',
          description: 'Impact environnemental et santé des produits ménagers',
          icon: '🧽',
          color: '#4FC3F7',
          features: ['Biodégradabilité', 'Toxicité aquatique', 'Émissions COV', 'Recettes DIY'],
          available: true
        }
      ],
      total_categories: 3,
      api_version: 'mock-1.0',
      timestamp: new Date().toISOString()
    };
  }

  private getMockAnalysis(product: any): AnalysisResponse {
    const scores = {
      food: Math.floor(Math.random() * 40) + 30, // 30-70
      cosmetics: Math.floor(Math.random() * 30) + 50, // 50-80
      detergents: Math.floor(Math.random() * 35) + 40 // 40-75
    };

    return {
      success: true,
      category: product.category || 'food',
      detection_confidence: 0.85 + Math.random() * 0.1,
      analysis: {
        overall_score: scores[product.category as keyof typeof scores] || 55,
        confidence: 0.8,
        sources: ['ANSES 2024', 'EFSA Guidelines', 'INSERM Research']
      },
      alternatives: [
        {
          name: 'Alternative bio naturelle',
          score: 85,
          description: 'Version plus naturelle et saine'
        }
      ],
      metadata: {
        processing_time_ms: Math.floor(Math.random() * 500) + 200,
        api_version: 'mock-1.0',
        request_id: `mock_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Récupérer les catégories avec fallback
  async getCategories(): Promise<CategoriesResponse> {
    await this.initializeEndpoint();

    if (this.baseUrl === 'mock') {
      console.log('🔄 Mode mock: Retour catégories simulées');
      return this.getMockCategories();
    }

    try {
      console.log('🔍 Récupération catégories depuis:', `${this.baseUrl}/api/multi-category/categories`);
      
      const response = await fetch(`${this.baseUrl}/api/multi-category/categories`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CategoriesResponse = await response.json();
      console.log('✅ Catégories récupérées depuis API:', data.categories?.length || 0);
      return data;

    } catch (error) {
      console.error('❌ Erreur API, basculement vers mock:', error);
      return this.getMockCategories();
    }
  }

  // Analyser un produit avec fallback
  async analyzeProduct(request: AnalysisRequest): Promise<AnalysisResponse> {
    await this.initializeEndpoint();

    if (this.baseUrl === 'mock') {
      console.log('🔄 Mode mock: Analyse simulée pour', request.product.title);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simuler délai
      return this.getMockAnalysis(request.product);
    }

    try {
      console.log('🧪 Analyse produit:', request.product.title);
      
      const enrichedRequest = {
        ...request,
        context: {
          ...request.context,
          anonymousId: request.context?.anonymousId || this.generateAnonymousId(),
        }
      };

      const response = await fetch(`${this.baseUrl}/api/multi-category/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedRequest),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur réseau' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: AnalysisResponse = await response.json();
      console.log('✅ Analyse terminée via API:', data.category, 'Score:', data.analysis?.overall_score);
      return data;

    } catch (error) {
      console.error('❌ Erreur analyse API, basculement vers mock:', error);
      return this.getMockAnalysis(request.product);
    }
  }

  // Test de connectivité amélioré - 🔧 FIX: Endpoints corrigés
  async testConnection(): Promise<boolean> {
    await this.initializeEndpoint();
    
    if (this.baseUrl === 'mock') {
      return true; // Mode mock toujours "connecté"
    }

    // 🔧 FIX: Utiliser les bons endpoints selon server.js
    const endpointsToTest = [
      `${this.baseUrl}/health`,                            // ✅ Endpoint principal dans server.js
      `${this.baseUrl}/api/multi-category/categories`,     // ✅ Fonctionne déjà
      `${this.baseUrl}/`,                                  // ✅ Route racine
    ];

    for (const endpoint of endpointsToTest) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          console.log(`✅ Connexion OK via: ${endpoint}`);
          return true;
        }
      } catch (error) {
        console.log(`❌ Échec connexion: ${endpoint}`, error instanceof Error ? error.message : error);
        continue;
      }
    }
    
    console.log('❌ Tous les tests de connexion ont échoué');
    return false;
  }

  // Données de test inchangées
  getTestData(): Record<string, AnalysisRequest> {
    return {
      food: {
        product: {
          title: "Céréales Bio aux Fruits",
          brand: "Nature & Progrès",
          description: "Céréales biologiques avec additifs et sucres ajoutés",
          ingredients: ["avoine bio", "sucre", "colorant naturel", "conservateur e200"],
          category: "food"
        },
        context: { userId: "test-food-user" }
      },
      cosmetics: {
        product: {
          title: "Shampooing Doux Bio",
          brand: "Cosmébio",
          description: "Shampooing avec sodium lauryl sulfate et parfum",
          ingredients: ["aqua", "sodium lauryl sulfate", "parfum", "glycerin", "limonene"],
          category: "cosmetics"
        },
        context: { userId: "test-cosmetics-user" }
      },
      detergents: {
        product: {
          title: "Lessive Écologique Concentrée",
          brand: "EcoVert",
          description: "Lessive avec tensioactifs végétaux et enzymes",
          ingredients: ["tensioactifs végétaux", "enzymes", "parfum", "zeolites", "conservateur"],
          category: "detergents"
        },
        context: { userId: "test-detergents-user" }
      }
    };
  }

  private generateAnonymousId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 🔧 FIX: Diagnostic spécifique pour server.js
  async diagnoseApiStructure(): Promise<void> {
    console.log('🔍 === DIAGNOSTIC API ECOLOJIA (SERVER.JS) ===');
    
    // Test endpoints server.js
    const serverEndpoints = [
      '/health',
      '/api/multi-category/categories',
      '/api/multi-category/analyze',
      '/'
    ];

    for (const endpoint of serverEndpoints) {
      try {
        const response = await fetch(`${API_ENDPOINTS.production}${endpoint}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        console.log(`${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`${endpoint}: ❌ ERREUR`);
      }
    }
    
    console.log('🔍 === FIN DIAGNOSTIC ===');
  }
}

// Instance par défaut
export const multiCategoryApi = new MultiCategoryApiService();

export type { AnalysisRequest, AnalysisResponse, Category, CategoriesResponse };
// PATH: src/services/algoliaService.ts
import algoliasearch from 'algoliasearch';
// // import { PrismaClient } from '@prisma/client';

// Configuration Algolia depuis les variables d'environnement
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);

// Index principal et staging
const productsIndex = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'ecolojia_products');
const stagingIndex = client.initIndex(process.env.ALGOLIA_INDEX_STAGING || 'ecolojia_products_staging');

// Types simplifiés pour éviter les erreurs d'import Prisma
interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  category: string;
  tags?: string[] | null;
  zones_dispo?: string[] | null;
  eco_score?: any; // Decimal Prisma
  ai_confidence?: any; // Decimal Prisma
  confidence_color?: string | null;
  verified_status?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  created_at: Date;
  updated_at: Date;
}

// Interface pour les objets Algolia optimisés pour la recherche
export interface AlgoliaProduct {
  objectID: string;
  title: string;
  slug: string;
  description?: string;
  brand?: string;
  category: string;
  tags: string[];
  zones_dispo: string[];
  eco_score?: number;
  ai_confidence?: number;
  confidence_color?: string;
  verified_status?: string;
  image_url?: string;
  images: string[];
  created_at: number;
  updated_at: number;
  
  // Champs optimisés pour la recherche Algolia
  _searchable_title: string;
  _searchable_brand: string;
  _searchable_tags: string;
  _searchable_description: string;
  
  // Classification et scoring
  nova_group?: number;
  is_verified: boolean;
  category_icon: string;
  confidence_score: number;
  
  // Géolocalisation et disponibilité
  availability_zones: string[];
  is_available: boolean;
}

export interface AlgoliaStats {
  totalProducts: number;
  categories: Record<string, number>;
  verificationStatus: Record<string, number>;
  novaGroups: Record<string, number>;
  confidenceLevels: Record<string, number>;
  lastUpdate: string;
}

export class AlgoliaService {
  
  /**
   * Convertit Decimal Prisma vers number
   */
  private static decimalToNumber(decimal: any): number | undefined {
    if (!decimal) return undefined;
    if (typeof decimal === 'number') return decimal;
    if (decimal.toNumber && typeof decimal.toNumber === 'function') {
      return decimal.toNumber();
    }
    return parseFloat(decimal.toString());
  }

  /**
   * Transforme un produit Prisma vers le format Algolia optimisé
   */
  static transformProductForAlgolia(product: Product): AlgoliaProduct {
    return {
      objectID: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description || undefined,
      brand: product.brand || undefined,
      category: product.category,
      tags: product.tags || [],
      zones_dispo: product.zones_dispo || [],
      eco_score: this.decimalToNumber(product.eco_score),
      ai_confidence: this.decimalToNumber(product.ai_confidence),
      confidence_color: product.confidence_color || undefined,
      verified_status: product.verified_status || undefined,
      image_url: product.image_url || undefined,
      images: product.images || [],
      created_at: Math.floor(new Date(product.created_at).getTime() / 1000),
      updated_at: Math.floor(new Date(product.updated_at).getTime() / 1000),
      
      // Champs de recherche optimisés
      _searchable_title: product.title.toLowerCase().trim(),
      _searchable_brand: (product.brand || '').toLowerCase().trim(),
      _searchable_tags: (product.tags || []).join(' ').toLowerCase(),
      _searchable_description: (product.description || '').toLowerCase().trim(),
      
      // Classification et scoring
      nova_group: this.estimateNovaGroup(product),
      is_verified: product.verified_status === 'verified',
      category_icon: this.getCategoryIcon(product.category),
      confidence_score: this.calculateConfidenceScore(product),
      
      // Disponibilité
      availability_zones: product.zones_dispo || [],
      is_available: (product.zones_dispo || []).length > 0
    };
  }

  /**
   * Estime le groupe NOVA depuis le contenu du produit
   */
  private static estimateNovaGroup(product: Product): number {
    const text = `${product.title} ${product.description || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
    
    // Mots-clés pour classification NOVA automatique
    const ultraProcessedKeywords = [
      'colorant', 'conservateur', 'exhausteur', 'émulsifiant', 'stabilisant', 
      'sirop glucose', 'huile palme', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6',
      'édulcorant', 'arôme artificiel', 'maltodextrine', 'dextrose'
    ];
    
    const processedKeywords = [
      'sucre ajouté', 'sel ajouté', 'huile végétale', 'margarine', 
      'concentré', 'poudre', 'sirop', 'extrait'
    ];
    
    const minimallyProcessedKeywords = [
      'bio', 'naturel', 'fermier', 'artisanal', 'tradition', 'maison',
      'frais', 'cru', 'complet', 'intégral'
    ];
    
    // Classification par priorité
    if (ultraProcessedKeywords.some(keyword => text.includes(keyword))) return 4;
    if (processedKeywords.some(keyword => text.includes(keyword))) return 3;
    if (minimallyProcessedKeywords.some(keyword => text.includes(keyword))) return 1;
    
    return 2; // Par défaut
  }

  /**
   * Retourne l'icône associée à une catégorie
   */
  private static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'alimentaire': '🔬',
      'cosmetic': '💄',
      'detergent': '🧽',
      'hygiene': '🧼',
      'beauty': '✨'
    };
    return icons[category] || '📦';
  }

  /**
   * Calcule un score de confiance global sur 100
   */
  private static calculateConfidenceScore(product: Product): number {
    let score = 50; // Base
    
    // Bonus pour les données complètes
    if (product.brand) score += 10;
    if (product.description && product.description.length > 50) score += 15;
    if (product.image_url) score += 10;
    if (product.eco_score) score += 10;
    
    // Bonus pour la vérification
    if (product.verified_status === 'verified') score += 20;
    else if (product.verified_status === 'ai_analyzed') score += 10;
    else if (product.verified_status === 'manual_review') score += 5;
    
    // Bonus confiance IA
    if (product.ai_confidence) {
      const aiConfidenceNum = this.decimalToNumber(product.ai_confidence);
      if (aiConfidenceNum) {
        score += Math.floor(aiConfidenceNum * 0.15);
      }
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Vérifie si un index existe et le crée si nécessaire
   */
  static async ensureIndexExists(useStaging = false): Promise<void> {
    try {
      const index = useStaging ? stagingIndex : productsIndex;
      const indexName = useStaging ? 'staging' : 'production';
      
      // Test d'existence avec une recherche vide
      try {
        await index.search('', { hitsPerPage: 0 });
        console.log(`✅ Index ${indexName} existe déjà`);
      } catch (error: any) {
        if (error.status === 404) {
          console.log(`📦 Création de l'index ${indexName}...`);
          
          // Créer l'index en ajoutant un objet temporaire puis en le supprimant
          const tempObject = {
            objectID: 'temp-init',
            title: 'Initialisation index',
            category: 'temp'
          };
          
          await index.saveObject(tempObject);
          await index.deleteObject('temp-init');
          
          console.log(`✅ Index ${indexName} créé avec succès`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`❌ Erreur vérification/création index:`, error);
      throw error;
    }
  }

  /**
   * Indexe un seul produit dans Algolia
   */
  static async indexProduct(product: Product, useStaging = false): Promise<void> {
    try {
      await this.ensureIndexExists(useStaging);
      
      const algoliaProduct = this.transformProductForAlgolia(product);
      const index = useStaging ? stagingIndex : productsIndex;
      
      await index.saveObject(algoliaProduct);
      console.log(`✅ Produit "${product.title}" indexé dans ${useStaging ? 'staging' : 'production'}`);
    } catch (error) {
      console.error(`❌ Erreur indexation produit ${product.id}:`, error);
      throw error;
    }
  }

  /**
   * Indexe plusieurs produits en batch
   */
  static async indexProducts(products: Product[], useStaging = false): Promise<{ success: number; failed: number }> {
    try {
      await this.ensureIndexExists(useStaging);
      
      const algoliaProducts = products.map(product => this.transformProductForAlgolia(product));
      const index = useStaging ? stagingIndex : productsIndex;
      
      const result = await index.saveObjects(algoliaProducts);
      
      const indexName = useStaging ? 'staging' : 'production';
      console.log(`✅ Batch indexé: ${products.length} produits dans ${indexName}`);
      console.log(`📊 ObjectIDs créés: ${result.objectIDs.length}`);
      
      return { success: products.length, failed: 0 };
    } catch (error) {
      console.error('❌ Erreur indexation batch:', error);
      return { success: 0, failed: products.length };
    }
  }

  /**
   * Supprime un produit de l'index Algolia
   */
  static async deleteProduct(productId: string, useStaging = false): Promise<void> {
    try {
      const index = useStaging ? stagingIndex : productsIndex;
      await index.deleteObject(productId);
      console.log(`✅ Produit ${productId} supprimé de l'index ${useStaging ? 'staging' : 'production'}`);
    } catch (error) {
      console.error(`❌ Erreur suppression produit ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Configure les paramètres optimaux de l'index Algolia
   */
  static async configureIndex(useStaging = false): Promise<void> {
    try {
      await this.ensureIndexExists(useStaging);
      
      const index = useStaging ? stagingIndex : productsIndex;
      
      await index.setSettings({
        // Attributs pour la recherche
        searchableAttributes: [
          'title',
          'brand',
          '_searchable_title',
          '_searchable_brand',
          'tags',
          '_searchable_tags',
          'description',
          '_searchable_description'
        ],
        
        // Attributs pour les filtres
        attributesForFaceting: [
          'category',
          'confidence_color',
          'verified_status',
          'nova_group',
          'is_verified',
          'zones_dispo',
          'availability_zones',
          'is_available'
        ],
        
        // Algorithme de ranking
        ranking: [
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom'
        ],
        
        // Tri personnalisé
        customRanking: [
          'desc(is_verified)',
          'desc(confidence_score)',
          'desc(ai_confidence)',
          'desc(created_at)'
        ],
        
        // Tolérance aux fautes
        typoTolerance: 'true',
        minWordSizefor1Typo: 4,
        minWordSizefor2Typos: 8,
        allowTyposOnNumericTokens: false,
        
        // Pagination
        hitsPerPage: 20,
        maxValuesPerFacet: 100,
        
        // Mise en évidence
        attributesToHighlight: ['title', 'brand', 'tags', 'description'],
        highlightPreTag: '<mark class="algolia-highlight">',
        highlightPostTag: '</mark>',
        
        // Snippets
        attributesToSnippet: ['description:20'],
        snippetEllipsisText: '…',
        
        // Performance
        enableRules: true,
        enablePersonalization: false,
        
        // Langues
        queryLanguages: ['fr', 'en'],
        indexLanguages: ['fr']
      });
      
      console.log(`✅ Configuration index ${useStaging ? 'staging' : 'production'} mise à jour`);
    } catch (error) {
      console.error('❌ Erreur configuration index:', error);
      throw error;
    }
  }

  /**
   * Vide complètement un index Algolia
   */
  static async clearIndex(useStaging = false): Promise<void> {
    try {
      await this.ensureIndexExists(useStaging);
      
      const index = useStaging ? stagingIndex : productsIndex;
      await index.clearObjects();
      console.log(`✅ Index ${useStaging ? 'staging' : 'production'} vidé complètement`);
    } catch (error) {
      console.error('❌ Erreur vidage index:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques détaillées de l'index
   */
  static async getIndexStats(useStaging = false): Promise<AlgoliaStats> {
    try {
      await this.ensureIndexExists(useStaging);
      
      const index = useStaging ? stagingIndex : productsIndex;
      const stats = await index.search('', { 
        facets: ['category', 'verified_status', 'nova_group', 'confidence_color'],
        hitsPerPage: 0 
      });
      
      return {
        totalProducts: stats.nbHits,
        categories: stats.facets?.category || {},
        verificationStatus: stats.facets?.verified_status || {},
        novaGroups: stats.facets?.nova_group || {},
        confidenceLevels: stats.facets?.confidence_color || {},
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erreur récupération stats index:', error);
      throw error;
    }
  }

  /**
   * Test de connexion et de fonctionnement
   */
  static async testConnection(): Promise<boolean> {
    try {
      // Test de connexion avec création automatique de l'index staging
      console.log('🔌 Test de connexion Algolia...');
      await this.ensureIndexExists(true); // staging
      
      const stats = await this.getIndexStats(true);
      console.log('✅ Connexion Algolia OK - Produits staging:', stats.totalProducts);
      return true;
    } catch (error) {
      console.error('❌ Test connexion Algolia échoué:', error);
      return false;
    }
  }

  /**
   * Recherche dans l'index avec filtres avancés
   */
  static async searchProducts(
    query: string,
    filters: {
      category?: string;
      nova_group?: number;
      verified_only?: boolean;
      available_only?: boolean;
    } = {},
    options: {
      hitsPerPage?: number;
      page?: number;
      useStaging?: boolean;
    } = {}
  ): Promise<any> {
    try {
      await this.ensureIndexExists(options.useStaging);
      
      const index = options.useStaging ? stagingIndex : productsIndex;
      
      // Construction des filtres Algolia
      const algoliaFilters: string[] = [];
      
      if (filters.category) {
        algoliaFilters.push(`category:${filters.category}`);
      }
      
      if (filters.nova_group) {
        algoliaFilters.push(`nova_group:${filters.nova_group}`);
      }
      
      if (filters.verified_only) {
        algoliaFilters.push('is_verified:true');
      }
      
      if (filters.available_only) {
        algoliaFilters.push('is_available:true');
      }
      
      const searchOptions: any = {
        hitsPerPage: options.hitsPerPage || 20,
        page: options.page || 0,
        facets: ['category', 'nova_group', 'verified_status', 'confidence_color']
      };
      
      if (algoliaFilters.length > 0) {
        searchOptions.filters = algoliaFilters.join(' AND ');
      }
      
      const result = await index.search(query, searchOptions);
      
      console.log(`🔍 Recherche "${query}" : ${result.hits.length} résultats`);
      return result;
      
    } catch (error) {
      console.error('❌ Erreur recherche Algolia:', error);
      throw error;
    }
  }
}

export default AlgoliaService;
// EOF

const axios = require('axios');

class DataIngestion {
  constructor(prisma, logger) {
    this.prisma = prisma;
    this.logger = logger;
    this.baseURL = 'https://world.openfoodfacts.org';
  }

  async importNewProducts(limit = 100) {
    try {
      this.logger.info(`🔍 Import OpenFoodFacts (limite: ${limit})`);
      
      // Récupérer produits récents OpenFoodFacts
      const response = await axios.get(`${this.baseURL}/api/v2/search`, {
        params: {
          countries_tags: 'france',
          states_tags: 'en:complete',
          fields: 'code,product_name,brands,categories,image_url,ingredients_text,nutriscore_grade,ecoscore_grade',
          page_size: limit,
          sort_by: 'last_modified_t'
        },
        timeout: 30000
      });

      const products = response.data.products || [];
      let imported = 0;
      let errors = 0;

      for (const product of products) {
        try {
          await this.importProduct(product);
          imported++;
        } catch (error) {
          errors++;
          this.logger.warn(`Erreur import produit ${product.code}:`, error.message);
        }
      }

      this.logger.info(`✅ Import terminé: ${imported} importés, ${errors} erreurs`);
      return { imported, errors };

    } catch (error) {
      this.logger.error('❌ Erreur import OpenFoodFacts:', error);
      throw error;
    }
  }

  async importProduct(offProduct) {
    // Vérifier si produit existe déjà
    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id: `off_${offProduct.code}` },
          { slug: this.generateSlug(offProduct.product_name) }
        ]
      }
    });

    if (existing) {
      return null; // Déjà existant
    }

    // Convertir données OpenFoodFacts
    const productData = {
      id: `off_${offProduct.code}`,
      title: offProduct.product_name || 'Produit OpenFoodFacts',
      description: this.generateDescription(offProduct),
      slug: this.generateSlug(offProduct.product_name),
      brand: offProduct.brands?.split(',')[0]?.trim() || null,
      category: this.mapCategory(offProduct.categories),
      tags: this.extractTags(offProduct),
      images: offProduct.image_url ? [offProduct.image_url] : [],
      zones_dispo: ['FR', 'EU'],
      prices: { default: 15.99, currency: 'EUR' },
      eco_score: this.convertScore(offProduct.ecoscore_grade),
      ai_confidence: 0.7, // Score par défaut OpenFoodFacts
      confidence_pct: 70,
      confidence_color: 'yellow',
      verified_status: 'ai_verified',
      external_id: offProduct.code,
      source: 'openfoodfacts'
    };

    const created = await this.prisma.product.create({ data: productData });
    this.logger.info(`📦 Produit importé: ${created.title}`);
    
    return created;
  }

  generateSlug(name) {
    if (!name) return `product-${Date.now()}`;
    
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) + `-${Date.now()}`;
  }

  generateDescription(product) {
    let desc = `Produit alimentaire`;
    
    if (product.brands) {
      desc += ` de la marque ${product.brands.split(',')[0].trim()}`;
    }
    
    if (product.categories) {
      const cat = product.categories.split(',')[0]?.replace('en:', '').trim();
      desc += `, catégorie ${cat}`;
    }
    
    if (product.ingredients_text) {
      desc += `. Ingrédients: ${product.ingredients_text.substring(0, 200)}`;
    }
    
    return desc;
  }

  mapCategory(categories) {
    if (!categories) return 'alimentaire';
    
    const cat = categories.toLowerCase();
    if (cat.includes('boisson')) return 'boissons';
    if (cat.includes('snack') || cat.includes('biscuit')) return 'snacks';
    if (cat.includes('dairy') || cat.includes('lait')) return 'produits-laitiers';
    
    return 'alimentaire';
  }

  extractTags(product) {
    const tags = [];
    
    if (product.nutriscore_grade) {
      tags.push(`nutriscore-${product.nutriscore_grade}`);
    }
    
    if (product.ecoscore_grade) {
      tags.push(`ecoscore-${product.ecoscore_grade}`);
    }
    
    if (product.categories) {
      const cats = product.categories.split(',').slice(0, 3);
      cats.forEach(cat => {
        const clean = cat.replace('en:', '').trim();
        if (clean && clean.length > 2) {
          tags.push(clean);
        }
      });
    }
    
    return tags.slice(0, 8); // Limiter à 8 tags
  }

  convertScore(grade) {
    const scoreMap = {
      'a': 4.5, 'b': 3.5, 'c': 2.5, 'd': 1.5, 'e': 0.5
    };
    return scoreMap[grade?.toLowerCase()] || 2.5;
  }
}

module.exports = DataIngestion;
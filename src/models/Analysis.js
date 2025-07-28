// backend/src/models/Analysis.js
const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  // Relations
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    index: true
  },
  
  // Informations produit (dénormalisées pour historique)
  productSnapshot: {
    name: String,
    brand: String,
    barcode: String,
    imageUrl: String,
    category: String
  },
  
  // Type d'analyse
  analysisType: {
    type: String,
    enum: ['barcode_scan', 'manual_entry', 'ai_analysis'],
    default: 'barcode_scan'
  },
  
  // Résultats d'analyse
  results: {
    healthScore: { 
      type: Number, 
      min: 0, 
      max: 100,
      required: true
    },
    
    // Résultats spécifiques alimentaire
    foodAnalysis: {
      novaScore: Number,
      novaDetails: mongoose.Schema.Types.Mixed,
      nutriScore: String,
      additiveCount: Number,
      additiveDetails: [mongoose.Schema.Types.Mixed],
      ultraTransformScore: Number
    },
    
    // Résultats spécifiques cosmétiques
    cosmeticsAnalysis: {
      endocrineRisk: Number,
      allergenCount: Number,
      naturalityScore: Number,
      concerns: [String]
    },
    
    // Résultats spécifiques détergents
    detergentsAnalysis: {
      environmentalImpact: Number,
      aquaticToxicity: Number,
      biodegradabilityScore: Number
    },
    
    // Alternatives suggérées
    alternatives: [{
      productId: mongoose.Schema.Types.ObjectId,
      name: String,
      brand: String,
      healthScore: Number,
      improvement: Number
    }],
    
    // Insights IA
    aiInsights: {
      summary: String,
      recommendations: [String],
      warnings: [String],
      customAnalysis: String // Pour les analyses DeepSeek premium
    }
  },
  
  // Métadonnées
  metadata: {
    appVersion: String,
    platform: String, // ios, android, web
    location: {
      country: String,
      city: String
    },
    scanDuration: Number, // ms
    aiModel: String // internal, deepseek, openai
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Index composés pour requêtes fréquentes
analysisSchema.index({ userId: 1, createdAt: -1 }); // Historique utilisateur
analysisSchema.index({ userId: 1, productId: 1 }); // Analyses d'un produit par user
analysisSchema.index({ userId: 1, 'results.healthScore': -1 }); // Meilleures analyses

// Méthodes virtuelles
analysisSchema.virtual('isHealthy').get(function() {
  return this.results.healthScore >= 70;
});

// Méthodes statiques
analysisSchema.statics.getUserHistory = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    category = null,
    minScore = null,
    maxScore = null,
    startDate = null,
    endDate = null
  } = options;
  
  const query = { userId };
  
  if (category) query['productSnapshot.category'] = category;
  if (minScore !== null || maxScore !== null) {
    query['results.healthScore'] = {};
    if (minScore !== null) query['results.healthScore']['$gte'] = minScore;
    if (maxScore !== null) query['results.healthScore']['$lte'] = maxScore;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt['$gte'] = new Date(startDate);
    if (endDate) query.createdAt['$lte'] = new Date(endDate);
  }
  
  const skip = (page - 1) * limit;
  
  const [analyses, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-metadata'),
    this.countDocuments(query)
  ]);
  
  return {
    analyses,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

analysisSchema.statics.getUserStats = async function(userId, period = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  
  const stats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        avgHealthScore: { $avg: '$results.healthScore' },
        minHealthScore: { $min: '$results.healthScore' },
        maxHealthScore: { $max: '$results.healthScore' },
        categories: { $addToSet: '$productSnapshot.category' }
      }
    },
    {
      $project: {
        _id: 0,
        totalAnalyses: 1,
        avgHealthScore: { $round: ['$avgHealthScore', 1] },
        minHealthScore: 1,
        maxHealthScore: 1,
        categoriesAnalyzed: { $size: '$categories' }
      }
    }
  ]);
  
  return stats[0] || {
    totalAnalyses: 0,
    avgHealthScore: 0,
    minHealthScore: 0,
    maxHealthScore: 0,
    categoriesAnalyzed: 0
  };
};

module.exports = mongoose.model('Analysis', analysisSchema);
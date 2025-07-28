// backend/src/models/Favorite.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Snapshot pour garder l'historique même si le produit change
  productSnapshot: {
    name: String,
    brand: String,
    barcode: String,
    imageUrl: String,
    category: String,
    healthScore: Number
  },
  
  // Métadonnées personnelles
  notes: {
    type: String,
    maxlength: 500
  },
  tags: [String], // ['petit-déjeuner', 'bio', 'enfants']
  
  // Notifications
  notifications: {
    priceDrops: { type: Boolean, default: false },
    betterAlternatives: { type: Boolean, default: false },
    recallAlerts: { type: Boolean, default: true }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastViewedAt: Date
});

// Index unique pour éviter les doublons
favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Méthodes statiques
favoriteSchema.statics.toggleFavorite = async function(userId, productId, productData = {}) {
  const existing = await this.findOne({ userId, productId });
  
  if (existing) {
    await existing.remove();
    return { added: false, favorite: null };
  } else {
    const favorite = await this.create({
      userId,
      productId,
      productSnapshot: productData
    });
    return { added: true, favorite };
  }
};

favoriteSchema.statics.getUserFavorites = async function(userId, options = {}) {
  const { 
    category = null, 
    tags = [],
    page = 1,
    limit = 20 
  } = options;
  
  const query = { userId };
  if (category) query['productSnapshot.category'] = category;
  if (tags.length > 0) query.tags = { $in: tags };
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .populate('productId', 'name brand imageUrl analysisData.healthScore')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('Favorite', favoriteSchema);
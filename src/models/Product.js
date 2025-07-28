// backend/src/models/Product.js
const mongoose = require('mongoose');

const additiveSchema = new mongoose.Schema({
  code: { type: String, required: true }, // E150d
  name: { type: String, required: true },
  function: String, // colorant, conservateur, etc.
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
    default: 'LOW'
  },
  healthConcerns: [String]
}, { _id: false });

const nutritionSchema = new mongoose.Schema({
  energy: Number, // kcal/100g
  fat: Number,
  saturatedFat: Number,
  carbohydrates: Number,
  sugars: Number,
  fiber: Number,
  protein: Number,
  salt: Number
}, { _id: false });

const cosmeticIngredientSchema = new mongoose.Schema({
  inci: String,
  function: String,
  origin: {
    type: String,
    enum: ['natural', 'synthetic', 'derived']
  },
  concerns: [String],
  isEndocrineDisruptor: { type: Boolean, default: false }
}, { _id: false });

const productSchema = new mongoose.Schema({
  // Identifiants
  barcode: { 
    type: String, 
    unique: true, 
    sparse: true,
    index: true 
  },
  
  // Informations de base
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  brand: {
    type: String,
    trim: true
  },
  category: { 
    type: String, 
    enum: ['food', 'cosmetics', 'detergents'],
    required: true,
    index: true
  },
  imageUrl: String,
  
  // Données spécifiques alimentaire
  foodData: {
    ingredients: [String],
    ingredientsParsed: mongoose.Schema.Types.Mixed,
    additives: [additiveSchema],
    allergens: [String],
    nutritionalInfo: nutritionSchema,
    novaScore: { type: Number, min: 1, max: 4 },
    nutriScore: { type: String, enum: ['A', 'B', 'C', 'D', 'E'] },
    ecoScore: { type: String, enum: ['A', 'B', 'C', 'D', 'E'] }
  },
  
  // Données spécifiques cosmétiques  
  cosmeticsData: {
    inciList: String,
    ingredients: [cosmeticIngredientSchema],
    endocrineDisruptors: [String],
    allergens: [String],
    certifications: [String] // bio, vegan, cruelty-free
  },
  
  // Données spécifiques détergents
  detergentsData: {
    composition: [String],
    surfactants: [String],
    phosphateFree: Boolean,
    biodegradable: Boolean,
    ecoLabels: [String]
  },
  
  // Métadonnées d'analyse
  analysisData: {
    healthScore: { type: Number, min: 0, max: 100 },
    lastAnalyzedAt: Date,
    version: String,
    confidence: Number
  },
  
  // Tracking
  viewCount: { type: Number, default: 0 },
  scanCount: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index composés pour performances
productSchema.index({ category: 1, 'analysisData.healthScore': -1 });
productSchema.index({ name: 'text', brand: 'text' });

// Middleware pour updatedAt
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Méthodes d'instance
productSchema.methods.incrementView = async function() {
  this.viewCount++;
  return this.save();
};

productSchema.methods.getPublicData = function() {
  const obj = this.toObject();
  // Retirer les données sensibles si nécessaire
  return obj;
};

// Méthodes statiques
productSchema.statics.findByBarcode = function(barcode) {
  return this.findOne({ barcode });
};

productSchema.statics.searchProducts = async function(query, category = null) {
  const searchCriteria = {
    $text: { $search: query }
  };
  
  if (category) {
    searchCriteria.category = category;
  }
  
  return this.find(searchCriteria)
    .select('-__v')
    .limit(20)
    .sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Product', productSchema);
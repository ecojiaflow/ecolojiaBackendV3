// PATH: backend/src/models/AnalysisCache.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalysisCache extends Document {
  productHash: string;
  barcode?: string;
  category: 'food' | 'cosmetics' | 'detergents';
  productName?: string;
  brand?: string;
  
  cachedAnalysis: {
    internalAI: any;
    healthScore: number;
    novaScore?: number;
    recommendations?: string[];
    lastUpdated: Date;
  };
  
  metadata: {
    hitCount: number;
    lastAccessed: Date;
    analysisVersion: string;
    userId?: string; // Pour tracking si nécessaire
  };
  
  ttl: Date; // Time To Live pour expiration automatique
}

const AnalysisCacheSchema = new Schema<IAnalysisCache>({
  productHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  barcode: {
    type: String,
    index: true
  },
  category: {
    type: String,
    enum: ['food', 'cosmetics', 'detergents'],
    required: true
  },
  productName: String,
  brand: String,
  
  cachedAnalysis: {
    internalAI: {
      type: Schema.Types.Mixed,
      required: true
    },
    healthScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    novaScore: {
      type: Number,
      min: 1,
      max: 4
    },
    recommendations: [String],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  metadata: {
    hitCount: {
      type: Number,
      default: 0
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    analysisVersion: {
      type: String,
      default: '1.0'
    },
    userId: String
  },
  
  ttl: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours par défaut
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Note: Les méthodes ne sont plus nécessaires car on gère directement dans le service

// Index composé pour recherche efficace
AnalysisCacheSchema.index({ category: 1, barcode: 1 });
AnalysisCacheSchema.index({ 'metadata.lastAccessed': -1 });

export const AnalysisCache = mongoose.model<IAnalysisCache>('AnalysisCache', AnalysisCacheSchema);
export default AnalysisCache;
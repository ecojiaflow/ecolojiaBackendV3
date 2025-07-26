// PATH: backend/src/models/UserAnalytics.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserAnalytics extends Document {
  userId: string;
  date: Date;
  
  // Métriques quotidiennes
  daily: {
    scans: number;
    aiQuestions: number;
    exports: number;
    apiCalls: number;
    uniqueProducts: string[];
    categoriesScanned: string[];
    averageHealthScore: number;
  };
  
  // Événements détaillés
  events: Array<{
    type: 'scan' | 'ai_question' | 'export' | 'api_call' | 'premium_upgrade' | 'login';
    timestamp: Date;
    metadata?: any;
    productId?: string;
    category?: string;
    healthScore?: number;
  }>;
  
  // Insights calculés
  insights: {
    mostScannedCategory: string;
    healthScoreTrend: 'improving' | 'stable' | 'declining';
    engagementLevel: 'low' | 'medium' | 'high';
    churnRisk: number; // 0-1
  };
}

const UserAnalyticsSchema = new Schema<IUserAnalytics>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  daily: {
    scans: { type: Number, default: 0 },
    aiQuestions: { type: Number, default: 0 },
    exports: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    uniqueProducts: [String],
    categoriesScanned: [String],
    averageHealthScore: { type: Number, default: 0 }
  },
  
  events: [{
    type: {
      type: String,
      enum: ['scan', 'ai_question', 'export', 'api_call', 'premium_upgrade', 'login'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: Schema.Types.Mixed,
    productId: String,
    category: String,
    healthScore: Number
  }],
  
  insights: {
    mostScannedCategory: String,
    healthScoreTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    },
    engagementLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    churnRisk: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  }
}, {
  timestamps: true
});

// Index composé unique pour un utilisateur par jour
UserAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

// Index pour requêtes de range de dates
UserAnalyticsSchema.index({ userId: 1, date: -1 });

// TTL pour auto-suppression après 90 jours (optionnel)
// UserAnalyticsSchema.index({ date: 1 }, { expireAfterSeconds: 7776000 });

// Méthode statique pour enregistrer un événement
UserAnalyticsSchema.statics.recordEvent = async function(
  userId: string,
  eventType: string,
  metadata?: any
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const analytics = await this.findOneAndUpdate(
    { userId, date: today },
    { 
      $inc: { [`daily.${eventType}s`]: 1 },
      $push: { 
        events: {
          type: eventType,
          timestamp: new Date(),
          metadata
        }
      }
    },
    { upsert: true, new: true }
  );
  
  // Recalculer les insights si analytics existe
  if (analytics) {
    await analytics.updateInsights();
  }
};

// Méthode pour mettre à jour les insights
UserAnalyticsSchema.methods.updateInsights = async function(): Promise<void> {
  // Calculer la catégorie la plus scannée
  const categoryCount: { [key: string]: number } = {};
  this.daily.categoriesScanned.forEach((cat: string) => {
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  
  this.insights.mostScannedCategory = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || '';
  
  // Calculer le niveau d'engagement
  const totalActions = this.daily.scans + this.daily.aiQuestions;
  if (totalActions >= 10) {
    this.insights.engagementLevel = 'high';
  } else if (totalActions >= 5) {
    this.insights.engagementLevel = 'medium';
  } else {
    this.insights.engagementLevel = 'low';
  }
  
  // Calculer le risque de churn (simplifié)
  if (this.insights.engagementLevel === 'low' && this.daily.scans < 2) {
    this.insights.churnRisk = 0.8;
  } else if (this.insights.engagementLevel === 'high') {
    this.insights.churnRisk = 0.2;
  }
  
  await this.save();
};

export const UserAnalytics = mongoose.model<IUserAnalytics>('UserAnalytics', UserAnalyticsSchema);
export default UserAnalytics;
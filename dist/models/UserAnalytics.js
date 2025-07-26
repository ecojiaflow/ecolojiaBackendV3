"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAnalytics = void 0;
// PATH: backend/src/models/UserAnalytics.ts
const mongoose_1 = __importStar(require("mongoose"));
const UserAnalyticsSchema = new mongoose_1.Schema({
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
            metadata: mongoose_1.Schema.Types.Mixed,
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
UserAnalyticsSchema.statics.recordEvent = async function (userId, eventType, metadata) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const analytics = await this.findOneAndUpdate({ userId, date: today }, {
        $inc: { [`daily.${eventType}s`]: 1 },
        $push: {
            events: {
                type: eventType,
                timestamp: new Date(),
                metadata
            }
        }
    }, { upsert: true, new: true });
    // Recalculer les insights si analytics existe
    if (analytics) {
        await analytics.updateInsights();
    }
};
// Méthode pour mettre à jour les insights
UserAnalyticsSchema.methods.updateInsights = async function () {
    // Calculer la catégorie la plus scannée
    const categoryCount = {};
    this.daily.categoriesScanned.forEach((cat) => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    this.insights.mostScannedCategory = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '';
    // Calculer le niveau d'engagement
    const totalActions = this.daily.scans + this.daily.aiQuestions;
    if (totalActions >= 10) {
        this.insights.engagementLevel = 'high';
    }
    else if (totalActions >= 5) {
        this.insights.engagementLevel = 'medium';
    }
    else {
        this.insights.engagementLevel = 'low';
    }
    // Calculer le risque de churn (simplifié)
    if (this.insights.engagementLevel === 'low' && this.daily.scans < 2) {
        this.insights.churnRisk = 0.8;
    }
    else if (this.insights.engagementLevel === 'high') {
        this.insights.churnRisk = 0.2;
    }
    await this.save();
};
exports.UserAnalytics = mongoose_1.default.model('UserAnalytics', UserAnalyticsSchema);
exports.default = exports.UserAnalytics;

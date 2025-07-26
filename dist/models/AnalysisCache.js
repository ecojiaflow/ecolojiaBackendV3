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
exports.AnalysisCache = void 0;
// PATH: backend/src/models/AnalysisCache.ts
const mongoose_1 = __importStar(require("mongoose"));
const AnalysisCacheSchema = new mongoose_1.Schema({
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
            type: mongoose_1.Schema.Types.Mixed,
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
exports.AnalysisCache = mongoose_1.default.model('AnalysisCache', AnalysisCacheSchema);
exports.default = exports.AnalysisCache;

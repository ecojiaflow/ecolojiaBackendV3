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
exports.ChatHistory = void 0;
// PATH: backend/src/models/ChatHistory.ts
const mongoose_1 = __importStar(require("mongoose"));
const ChatHistorySchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    productId: String,
    productName: String,
    messages: [{
            role: {
                type: String,
                enum: ['user', 'assistant', 'system'],
                required: true
            },
            content: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            tokensUsed: Number,
            model: String
        }],
    metadata: {
        totalTokensUsed: {
            type: Number,
            default: 0
        },
        lastModel: {
            type: String,
            default: 'gpt-3.5-turbo'
        },
        category: {
            type: String,
            enum: ['food', 'cosmetics', 'detergents']
        },
        isPremiumSession: {
            type: Boolean,
            default: false
        }
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'archived'],
        default: 'active'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: Date
}, {
    timestamps: true
});
// Méthode pour ajouter un message
ChatHistorySchema.methods.addMessage = async function (message) {
    this.messages.push(message);
    // Mettre à jour les métadonnées
    if (message.tokensUsed) {
        this.metadata.totalTokensUsed += message.tokensUsed;
    }
    if (message.model) {
        this.metadata.lastModel = message.model;
    }
    await this.save();
};
// Méthode pour calculer le total de tokens - FIX: Ajout des types explicites
ChatHistorySchema.methods.calculateTotalTokens = function () {
    return this.messages.reduce((total, msg) => total + (msg.tokensUsed || 0), 0);
};
// Index pour recherche efficace
ChatHistorySchema.index({ userId: 1, startedAt: -1 });
ChatHistorySchema.index({ sessionId: 1 });
ChatHistorySchema.index({ status: 1, endedAt: 1 });
// TTL pour auto-archivage des vieilles conversations (30 jours)
ChatHistorySchema.index({ endedAt: 1 }, { expireAfterSeconds: 2592000 });
exports.ChatHistory = mongoose_1.default.model('ChatHistory', ChatHistorySchema);
exports.default = exports.ChatHistory;

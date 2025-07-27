// PATH: backend/src/models/ChatHistory.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  model?: string;
}

export interface IChatHistory extends Document {
  userId: string;
  sessionId: string;
  productId?: string;
  productName?: string;
  
  messages: IChatMessage[];
  
  metadata: {
    totalTokensUsed: number;
    lastModel: string;
    category?: 'food' | 'cosmetics' | 'detergents';
    isPremiumSession: boolean;
  };
  
  status: 'active' | 'completed' | 'archived';
  startedAt: Date;
  endedAt?: Date;
  
  // Méthodes
  addMessage(message: IChatMessage): Promise<void>;
  calculateTotalTokens(): number;
}

const ChatHistorySchema = new Schema<IChatHistory>({
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
ChatHistorySchema.methods.addMessage = async function(message: IChatMessage): Promise<void> {
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
ChatHistorySchema.methods.calculateTotalTokens = function(): number {
  return this.messages.reduce((total: number, msg: IChatMessage) => total + (msg.tokensUsed || 0), 0);
};

// Index pour recherche efficace
ChatHistorySchema.index({ userId: 1, startedAt: -1 });
ChatHistorySchema.index({ sessionId: 1 });
ChatHistorySchema.index({ status: 1, endedAt: 1 });

// TTL pour auto-archivage des vieilles conversations (30 jours)
ChatHistorySchema.index({ endedAt: 1 }, { expireAfterSeconds: 2592000 });

export const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
export default ChatHistory;
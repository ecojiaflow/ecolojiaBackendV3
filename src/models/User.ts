// PATH: backend/src/models/User.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  tier: 'free' | 'premium';
  
  // Lemon Squeezy
  lemonSqueezyCustomerId?: string;
  lemonSqueezySubscriptionId?: string;
  subscriptionStatus?: 'active' | 'cancelled' | 'expired' | 'past_due';
  subscriptionStartDate?: Date;
  subscriptionCurrentPeriodEnd?: Date;
  subscriptionCancelledAt?: Date;
  
  // Quotas
  quotas: {
    analyses: number;      // -1 = illimité
    aiQuestions: number;   // -1 = illimité
    exports: number;       // nombre par mois
    apiCalls: number;      // nombre par mois
  };
  
  // Usage actuel
  usage: {
    analyses: number;
    aiQuestions: number;
    exports: number;
    apiCalls: number;
    lastResetDate: Date;
  };
  
  // Auth
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  
  // Méthodes
  checkQuota(quotaType: 'analyses' | 'aiQuestions' | 'exports' | 'apiCalls'): boolean;
  incrementUsage(usageType: 'analyses' | 'aiQuestions' | 'exports' | 'apiCalls'): Promise<void>;
  resetMonthlyUsage(): Promise<void>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  tier: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  
  // Lemon Squeezy
  lemonSqueezyCustomerId: {
    type: String,
    sparse: true
  },
  lemonSqueezySubscriptionId: {
    type: String,
    sparse: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due'],
    default: undefined
  },
  subscriptionStartDate: Date,
  subscriptionCurrentPeriodEnd: Date,
  subscriptionCancelledAt: Date,
  
  // Quotas
  quotas: {
    type: {
      analyses: { type: Number, default: 30 },
      aiQuestions: { type: Number, default: 0 },
      exports: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 }
    },
    default: {
      analyses: 30,
      aiQuestions: 0,
      exports: 0,
      apiCalls: 0
    }
  },
  
  // Usage
  usage: {
    type: {
      analyses: { type: Number, default: 0 },
      aiQuestions: { type: Number, default: 0 },
      exports: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now }
    },
    default: {
      analyses: 0,
      aiQuestions: 0,
      exports: 0,
      apiCalls: 0,
      lastResetDate: new Date()
    }
  },
  
  // Auth
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Méthodes
UserSchema.methods.checkQuota = function(quotaType: keyof IUser['quotas']): boolean {
  // Premium = illimité (-1)
  if (this.quotas[quotaType] === -1) return true;
  
  // Vérifier si l'usage actuel est inférieur au quota
  return this.usage[quotaType] < this.quotas[quotaType];
};

UserSchema.methods.incrementUsage = async function(usageType: keyof IUser['usage']): Promise<void> {
  if (usageType !== 'lastResetDate') {
    this.usage[usageType] += 1;
    await this.save();
  }
};

UserSchema.methods.resetMonthlyUsage = async function(): Promise<void> {
  this.usage = {
    analyses: 0,
    aiQuestions: 0,
    exports: 0,
    apiCalls: 0,
    lastResetDate: new Date()
  };
  await this.save();
};

// Vérifier et réinitialiser l'usage mensuel si nécessaire
UserSchema.pre('save', function(next) {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);
  
  // Si on est dans un nouveau mois, réinitialiser
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usage = {
      analyses: 0,
      aiQuestions: 0,
      exports: 0,
      apiCalls: 0,
      lastResetDate: now
    };
  }
  
  next();
});

// Index
UserSchema.index({ email: 1 });
UserSchema.index({ lemonSqueezySubscriptionId: 1 });
UserSchema.index({ lemonSqueezyCustomerId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
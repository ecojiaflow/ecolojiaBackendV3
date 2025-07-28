// backend/src/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
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
    enum: ['active', 'cancelled', 'expired', 'past_due']
  },
  subscriptionStartDate: Date,
  subscriptionCurrentPeriodEnd: Date,
  subscriptionCancelledAt: Date,
  
  // Quotas
  quotas: {
    analyses: { type: Number, default: 30 },
    aiQuestions: { type: Number, default: 0 },
    exports: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 }
  },
  
  // Usage
  usage: {
    analyses: { type: Number, default: 0 },
    aiQuestions: { type: Number, default: 0 },
    exports: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },
  
  // Auth
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Dashboard stats
  currentStreak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Méthodes
UserSchema.methods.checkQuota = function(quotaType) {
  // Premium = illimité (-1)
  if (this.quotas[quotaType] === -1) return true;
  
  // Vérifier si l'usage actuel est inférieur au quota
  return this.usage[quotaType] < this.quotas[quotaType];
};

UserSchema.methods.incrementUsage = async function(usageType) {
  if (usageType !== 'lastResetDate') {
    this.usage[usageType] += 1;
    await this.save();
  }
};

UserSchema.methods.resetMonthlyUsage = async function() {
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

module.exports = mongoose.model('User', UserSchema);
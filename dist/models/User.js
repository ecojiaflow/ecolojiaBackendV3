"use strict";
// PATH: backend/src/models/User.ts
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
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
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
UserSchema.methods.checkQuota = function (quotaType) {
    // Premium = illimité (-1)
    if (this.quotas[quotaType] === -1)
        return true;
    // Vérifier si l'usage actuel est inférieur au quota
    return this.usage[quotaType] < this.quotas[quotaType];
};
UserSchema.methods.incrementUsage = async function (usageType) {
    if (usageType !== 'lastResetDate') {
        this.usage[usageType] += 1;
        await this.save();
    }
};
UserSchema.methods.resetMonthlyUsage = async function () {
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
UserSchema.pre('save', function (next) {
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
exports.User = mongoose_1.default.model('User', UserSchema);
exports.default = exports.User;

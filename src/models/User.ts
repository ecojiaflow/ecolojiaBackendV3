// PATH: src/models/User.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  tier: 'free' | 'premium';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  // ✅ Champs Lemon Squeezy
  customerId?: string;
  subscriptionId?: string;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
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
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ✅ Champs Lemon Squeezy persistés
    customerId: {
      type: String,
      default: null
    },
    subscriptionId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index pour les recherches
UserSchema.index({ email: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
// EOF

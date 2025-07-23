// backend/src/types/user.types.ts

export interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'premium';
  isEmailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
// PATH: src/services/user.service.ts
import User from '../models/User';

export async function getUserById(userId: string) {
  return await User.findById(userId);
}

export async function updateUserById(userId: string, updates: Partial<any>) {
  return await User.findByIdAndUpdate(userId, updates, { new: true });
}
// EOF

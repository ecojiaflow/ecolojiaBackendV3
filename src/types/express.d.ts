// backend/src/types/express.d.ts

import { SafeUser } from '../auth/types/AuthTypes';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      token?: string;
      quota?: {
        action: string;
        remaining: number;
        limit: number;
      };
    }
  }
}

export {};
import 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        userId: string;
        role: 'USER' | 'ADMIN';
        email?: string;
      };
    }
  }
}

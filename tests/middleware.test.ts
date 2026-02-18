import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { authenticate } from '../src/middleware/auth';

interface ErrorResponse {
  error: string;
}

describe('Auth Middleware', () => {
  const testApp = express();
  // Fix: Cast middleware to any to resolve type mismatch with express app.use overloads
  testApp.use(express.json() as any);
  
  // Minimal secure route for testing the middleware
  // Fix: Use any casting for middleware and handler to resolve Request/Response type incompatibilities and access custom user property
  testApp.get('/test-auth', authenticate as any, ((req: Request, res: Response) => {
    const r = req as any;
    const s = res as any;
    s.json({ userId: r.user?.userId });
  }) as any);

  it('should return 401 if no token is provided', async () => {
    const response = await request(testApp).get('/test-auth');
    expect(response.status).toBe(401);
    
    const body = response.body as ErrorResponse;
    expect(body.error).toBe('Niste autentifikovani');
  });

  it('should return 401 for an invalid token', async () => {
    const response = await request(testApp)
      .get('/test-auth')
      .set('Authorization', 'Bearer invalid-token-string');
      
    expect(response.status).toBe(401);
    
    const body = response.body as ErrorResponse;
    expect(body.error).toBe('Nevalidan ili istekao token');
  });
});
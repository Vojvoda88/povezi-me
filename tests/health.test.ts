import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';

interface HealthResponse {
  status: string;
  timestamp: string;
  env: string;
}

describe('Health Check', () => {
  it('should return 200 OK for /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    
    const body = response.body as HealthResponse;
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
  });
});
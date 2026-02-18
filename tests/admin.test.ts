import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';

vi.mock('../src/lib/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', banned: false }) },
    ad: { update: vi.fn() },
    $connect: vi.fn(),
  }
}));

describe('Admin Ad Management', () => {
  const adminToken = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, process.env.JWT_SECRET || 'super-tajni-kljuc');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update ad status to PRODAN when requested by admin', async () => {
    const adId = 'ad-123';
    (prisma.ad.update as any).mockResolvedValue({ id: adId, status: 'PRODAN' });

    const response = await request(app)
      .post(`/api/admin/ads/${adId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PRODAN' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Status ažuriran');
    expect(prisma.ad.update).toHaveBeenCalledWith({
      where: { id: adId },
      data: expect.objectContaining({ status: 'PRODAN' })
    });
  });

  it('should reject invalid status values', async () => {
    const response = await request(app)
      .post('/api/admin/ads/123/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVALID_STATUS' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

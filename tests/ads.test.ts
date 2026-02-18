import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/lib/prisma';

vi.mock('../src/lib/adLifecycle', () => ({
  runAdLifecycleCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/lib/prisma', () => ({
  default: {
    ad: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $connect: vi.fn(),
  }
}));

describe('Ads API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch only AKTIVAN ads', async () => {
    const mockAds = [{
      id: '1',
      naslov: 'Test Ad',
      status: 'AKTIVAN',
      images: [],
      createdAt: new Date().toISOString(),
      featuredUntil: null,
      pogledi: 0,
      _count: { favoritedBy: 0 },
    }];
    (prisma.ad.findMany as any).mockResolvedValue(mockAds);
    (prisma.ad.count as any).mockResolvedValue(1);

    const response = await request(app).get('/api/ads');

    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.ads != null || Array.isArray(body)).toBe(true);
    expect(prisma.ad.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'AKTIVAN' })
      })
    );
  });

  describe('Motorna vozila (category + subcategory)', () => {
    it('GET ?kategorija=motorna_vozila&subcategory=kamioni filters by category and subcategory', async () => {
      (prisma.ad.findMany as any).mockResolvedValue([]);
      (prisma.ad.count as any).mockResolvedValue(0);

      const res = await request(app).get('/api/ads?kategorija=motorna_vozila&subcategory=kamioni');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ads');
      expect(res.body).toHaveProperty('total');
      const findManyCall = (prisma.ad.findMany as any).mock.calls[0]?.[0];
      expect(findManyCall?.where?.kategorija).toBe('motorna_vozila');
      expect(findManyCall?.where?.potkategorija).toBe('kamioni');
    });

    it('GET ?kategorija=motorna_vozila&subcategory=traktori filters by category and subcategory', async () => {
      (prisma.ad.findMany as any).mockResolvedValue([]);
      (prisma.ad.count as any).mockResolvedValue(0);

      const res = await request(app).get('/api/ads?kategorija=motorna_vozila&subcategory=traktori');

      expect(res.status).toBe(200);
      const findManyCall = (prisma.ad.findMany as any).mock.calls[0]?.[0];
      expect(findManyCall?.where?.kategorija).toBe('motorna_vozila');
      expect(findManyCall?.where?.potkategorija).toBe('traktori');
    });
  });
});
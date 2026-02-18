import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://povezi.me').replace(/\/$/, '');
// API_PUBLIC_URL koristi se za SEO endpoint-e (robots/sitemap) – može biti različit od PUBLIC_SITE_URL.
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || process.env.BACKEND_URL || 'https://api.povezi.me').replace(
  /\/$/,
  ''
);

let sitemapCache: { xml: string; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000;

const generateSitemap = async () => {
  const now = Date.now();
  if (sitemapCache && now - sitemapCache.timestamp < CACHE_DURATION) {
    return sitemapCache.xml;
  }
  const ads = await prisma.ad.findMany({
    where: { status: 'AKTIVAN', deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' }
  });
  const categories = [
    'motorna-vozila', 'auto-dijelovi', 'nekretnine', 'tehnika',
    'bijela-tehnika', 'namjestaj', 'moda', 'poslovi', 'usluge',
    'poljoprivreda', 'kucni-ljubimci', 'sport-i-rekreacija',
    'gradjevina-i-alati', 'pokloni-i-cvijece', 'ostalo'
  ];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${PUBLIC_SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;
  categories.forEach(cat => {
    xml += `
  <url>
    <loc>${PUBLIC_SITE_URL}/kategorija/${cat}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });
  ads.forEach((ad: { slug: string; updatedAt: Date }) => {
    xml += `
  <url>
    <loc>${PUBLIC_SITE_URL}/oglas/${ad.slug}</loc>
    <lastmod>${new Date(ad.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });
  xml += '\n</urlset>';
  sitemapCache = { xml, timestamp: now };
  return xml;
};

router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const s = res as any;
    const xml = await generateSitemap();
    s.header('Content-Type', 'application/xml');
    s.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    (res as any).status(500).end();
  }
});

router.get('/robots.txt', (_req: Request, res: Response) => {
  const s = res as any;
  s.header('Content-Type', 'text/plain');
  s.send(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/auth/me

Sitemap: ${API_PUBLIC_URL}/sitemap.xml`
  );
});

export default router;

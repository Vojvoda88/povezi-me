import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import {
  MOTORNA_VOZILA_SUBCATEGORIES,
  MOTORNA_VOZILA_CATEGORY_ID,
  type VehicleSubcategoryId,
} from '../config/vehicleTaxonomy';

const router = Router();

const VALID_SUBCATEGORIES = new Set(MOTORNA_VOZILA_SUBCATEGORIES.map((s) => s.id));

/**
 * GET /api/vehicles/makes?vehicleType=automobili|motocikli|kamioni|traktori|cetvorotockasi
 * Vraća listu proizvođača za datu podkategoriju (za dropdown).
 */
router.get('/makes', (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const vehicleType = (r.query.vehicleType as string) || (r.query.subcategory as string);
  if (!vehicleType || !VALID_SUBCATEGORIES.has(vehicleType as VehicleSubcategoryId)) {
    return s.status(400).json({ error: 'Parametar vehicleType (ili subcategory) je obavezan i mora biti jedna od: automobili, motocikli, kamioni, traktori, cetvorotockasi, kombi, autobusi, prikolice, kamperi.' });
  }
  try {
    const makes = await prisma.vehicleMake.findMany({
      where: { vehicleType },
      orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, isPrimary: true },
    });
    s.json({ makes });
  } catch (err) {
    console.error('GET /makes error:', err);
    s.status(500).json({ error: 'Greška pri preuzimanju proizvođača.' });
  }
}) as any);

/**
 * GET /api/vehicles/models?makeId=xxx ili ?makeSlug=xxx&vehicleType=yyy
 * Vraća modele za datog proizvođača (za dropdown).
 */
router.get('/models', (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const makeId = r.query.makeId as string | undefined;
  const makeSlug = r.query.makeSlug as string | undefined;
  const vehicleType = (r.query.vehicleType as string) || (r.query.subcategory as string);

  if (makeId) {
    try {
      const models = await prisma.vehicleModel.findMany({
        where: { makeId },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, isPrimary: true },
      });
      return s.json({ models });
    } catch (err) {
      console.error('GET /models by makeId error:', err);
      return s.status(500).json({ error: 'Greška pri preuzimanju modela.' });
    }
  }

  if (makeSlug && vehicleType && VALID_SUBCATEGORIES.has(vehicleType as VehicleSubcategoryId)) {
    try {
      const make = await prisma.vehicleMake.findUnique({
        where: { slug_vehicleType: { slug: makeSlug, vehicleType } },
        include: { models: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }], select: { id: true, name: true, slug: true, isPrimary: true } } },
      });
      if (!make) return s.json({ models: [] });
      return s.json({ models: make.models });
    } catch (err) {
      console.error('GET /models by makeSlug error:', err);
      return s.status(500).json({ error: 'Greška pri preuzimanju modela.' });
    }
  }

  s.status(400).json({ error: 'Potreban je makeId ili (makeSlug + vehicleType/subcategory).' });
}) as any);

export default router;

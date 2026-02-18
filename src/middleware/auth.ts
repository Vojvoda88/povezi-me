import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-tajni-kljuc';

export const authenticate: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Niste autentifikovani' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === 'object' && decoded !== null) {
      const payload = decoded as { userId: string; role: string; email?: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, banned: true }
      });
      if (!user) {
        res.status(401).json({ error: 'Korisnik nije pronađen' });
        return;
      }
      if (user.banned) {
        res.status(403).json({ error: 'Nalog je blokiran. Kontaktirajte podršku.' });
        return;
      }
      req.user = {
        id: payload.userId,
        userId: payload.userId,
        role: payload.role as 'USER' | 'ADMIN',
        email: payload.email
      };
      next();
    } else {
      res.status(401).json({ error: 'Nevalidan token' });
      return;
    }
  } catch (err) {
    res.status(401).json({ error: 'Nevalidan ili istekao token' });
    return;
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Pristup zabranjen: Samo za administratore' });
    return;
  }
  next();
};

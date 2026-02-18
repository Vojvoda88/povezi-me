import { randomBytes, createHash } from 'crypto';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { sendEmail } from '../lib/email';
import { verifyCaptcha } from '../lib/captcha';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-tajni-kljuc';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const BACKEND_URL_ENV = (process.env.BACKEND_URL || '').replace(/\/$/, '') || null;

function getBackendBase(req: Request): string {
  if (BACKEND_URL_ENV) return BACKEND_URL_ENV;
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3001';
  return `${proto}://${host}`.replace(/\/$/, '');
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 100 : 10,
  message: { error: 'Previše pokušaja prijave, pokušajte ponovo kasnije.' } as any
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Previše zahtjeva. Pokušajte za sat vremena.' } as any
});

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const registerSchema = z.object({
  ime: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  telefon: z.string().min(6),
  captchaToken: z.string().optional()
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const r = req as any;
    const s = res as any;
    const data = registerSchema.parse(r.body);
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const valid = await verifyCaptcha(data.captchaToken);
      if (!valid) {
        s.status(400).json({ error: 'CAPTCHA validacija nije uspjela. Pokušajte ponovo.' });
        return;
      }
    }
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return s.status(400).json({ error: 'Email je već u upotrebi' });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        ime: data.ime,
        email: data.email,
        passwordHash,
        telefon: data.telefon
      }
    });

    const token = jwt.sign({ userId: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...userSansHash } = user;
    s.status(201).json({ accessToken: token, user: userSansHash });
  } catch (err: any) {
    (res as any).status(400).json({ error: err.errors?.[0]?.message || 'Greška pri registraciji' });
  }
});

router.post('/login', loginLimiter as any, async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const { email, password } = r.body || {};
  if (!email || !password) return s.status(400).json({ error: 'Email i lozinka su obavezni' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return s.status(401).json({ error: 'Pogrešni kredencijali' });
  if (user.banned) return s.status(403).json({ error: 'Nalog je blokiran. Kontaktirajte podršku.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return s.status(401).json({ error: 'Pogrešni kredencijali' });

  const token = jwt.sign({ userId: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...userSansHash } = user;
  s.json({ accessToken: token, user: userSansHash });
});

router.get('/me', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  if (!userId) {
    s.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      s.status(404).json({ error: 'Korisnik nije pronađen' });
      return;
    }
    const { passwordHash: _, ...userSansHash } = user;
    s.json(userSansHash);
  } catch (err) {
    s.status(500).json({ error: 'Interna greška' });
  }
}) as any);

/**
 * Facebook OAuth: trenutno nije implementirano – redirect na frontend sa porukom
 */
router.get('/facebook', (req: Request, res: Response) => {
  const FRONTEND_URL_AUTH = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  (res as any).redirect(`${FRONTEND_URL_AUTH}/prijava?error=facebook_coming_soon`);
});

/**
 * Google OAuth: redirect na Google consent screen
 */
router.get('/google', (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    (res as any).status(503).json({ error: 'Google prijava nije podešena' });
    return;
  }
  const redirectUri = `${getBackendBase(req)}/api/auth/google/callback`;
  const scope = encodeURIComponent('openid email profile');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=select_account`;
  (res as any).redirect(url);
});

/**
 * Google OAuth callback: razmjena code za token, dohvat profila, kreiranje/prijava korisnika
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const code = r.query?.code;
  if (!code || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    s.redirect(`${FRONTEND_URL}/prijava?error=google_missing`);
    return;
  }
  const redirectUri = `${getBackendBase(req)}/api/auth/google/callback`;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      s.redirect(`${FRONTEND_URL}/prijava?error=google_token`);
      return;
    }
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const googleUser = await userRes.json();
    const email = googleUser?.email;
    const ime = googleUser?.name || email?.split('@')[0] || 'Korisnik';
    if (!email) {
      s.redirect(`${FRONTEND_URL}/prijava?error=google_email`);
      return;
    }
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const randomPassword = randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await prisma.user.create({
        data: {
          ime,
          email,
          passwordHash,
          telefon: '-'
        }
      });
    }
    if (user.banned) {
      s.redirect(`${FRONTEND_URL}/prijava?error=account_banned`);
      return;
    }
    const token = jwt.sign({ userId: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    s.redirect(`${FRONTEND_URL}/prijava?token=${token}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    s.redirect(`${FRONTEND_URL}/prijava?error=google_fail`);
  }
});

const forgotPasswordSchema = z.object({ email: z.string().email() });
router.post('/forgot-password', forgotPasswordLimiter as any, async (req: Request, res: Response) => {
  const s = res as any;
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      s.status(400).json({ error: 'Unesite ispravan email.' });
      return;
    }
    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      s.status(200).json({ message: 'Ako postoji nalog s tim emailom, poslat ćemo link za reset.' });
      return;
    }
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt }
    });
    const resetLink = `${FRONTEND_URL}/reset-lozinke?token=${rawToken}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[FORGOT PASSWORD] Reset link:', resetLink);
    }
    await sendEmail(
      user.email,
      'Reset lozinke - Povezi.ME',
      `Poštovani,\n\nKliknite na link za reset lozinke (vrijedi 1 sat):\n${resetLink}\n\nAko niste zatražili reset, zanemarite ovaj email.`
    );
    s.status(200).json({ message: 'Ako postoji nalog s tim emailom, poslat ćemo link za reset.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    s.status(500).json({ error: 'Greška pri slanju zahtjeva.' });
  }
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6)
});
router.post('/reset-password', async (req: Request, res: Response) => {
  const s = res as any;
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      s.status(400).json({ error: 'Token i nova lozinka (min 6 znakova) su obavezni.' });
      return;
    }
    const { token, newPassword } = parsed.data;
    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      include: { user: true }
    });
    if (!record) {
      s.status(400).json({ error: 'Link za reset je nevažeći ili je istekao.' });
      return;
    }
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      s.status(400).json({ error: 'Link za reset je istekao. Zatražite novi.' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.delete({ where: { id: record.id } })
    ]);
    s.status(200).json({ message: 'Lozinka je promijenjena. Možete se prijaviti.' });
  } catch (err) {
    console.error('Reset password error:', err);
    s.status(500).json({ error: 'Greška pri resetu lozinke.' });
  }
});

export default router;
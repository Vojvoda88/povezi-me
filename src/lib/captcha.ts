const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

export async function verifyCaptcha(token: string | undefined): Promise<boolean> {
  if (!RECAPTCHA_SECRET || !token) return false;
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token })
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}


export const verifyStripeSignature = (sessionId: string, token: string): boolean => {
  if (!sessionId || !token) return false;
  try {
    return btoa(sessionId) === token;
  } catch (e) {
    return false;
  }
};

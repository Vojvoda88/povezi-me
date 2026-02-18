
export const sanitizeHTML = (str: string): string => {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
};

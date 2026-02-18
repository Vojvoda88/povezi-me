/**
 * XSS zaštita – sanitize-html.
 * Dozvoljen: običan tekst, line break, basic formatting (strong, em, br).
 * Zabranjen: script, on* eventi, style, iframe, svg, object.
 */
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'br', 'p'];
const ALLOWED_ATTR: Record<string, string[]> = {};

export function sanitizeHTML(str: string): string {
  if (!str || typeof str !== 'string') return '';
  const cleaned = sanitizeHtml(str, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedSchemes: [],
    disallowedTagsMode: 'discard',
  });
  return cleaned.trim();
}

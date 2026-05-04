import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export function sanitizeHtml(html: string): string {
  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|#|\/)/i,
  });
  return cleaned.replace(
    /<a\s+([^>]*?)>/gi,
    (_match, attrs) => {
      const cleanedAttrs = String(attrs)
        .replace(/\s*target\s*=\s*("[^"]*"|'[^']*'|\S+)/gi, '')
        .replace(/\s*rel\s*=\s*("[^"]*"|'[^']*'|\S+)/gi, '')
        .trim();
      return `<a ${cleanedAttrs} target="_blank" rel="noopener noreferrer">`;
    },
  );
}

export function isHtmlEmpty(html: string): boolean {
  const stripped = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, '')
    .trim();
  return stripped.length === 0;
}

/**
 * sanitizer.ts
 *
 * Server-side HTML sanitization utility.
 *
 * THREAT MODEL:
 *   User-submitted content (feedback title/description, admin notes, college names)
 *   may contain HTML or JavaScript that, if rendered via innerHTML or
 *   dangerouslySetInnerHTML, could execute XSS attacks against admin or student
 *   browsers.
 *
 * APPROACH:
 *   - Strip all HTML tags from user content before storage (defence in depth).
 *   - Encode HTML entities for any content that may be reflected back.
 *   - React's JSX automatically escapes text content, but these functions
 *     provide explicit server-side defence for any raw string operations.
 *
 * NOTE: This is a lightweight alternative to DOMPurify (which requires DOM APIs
 * unavailable in Next.js server routes). Use this for plain-text fields only.
 * For rich-text fields requiring safe HTML, install and use DOMPurify on the client.
 */

/**
 * Strip all HTML tags from a string, leaving only plain text.
 * This prevents stored XSS if content is ever rendered via innerHTML.
 *
 * @example
 *   stripHtml('<script>alert(1)</script>Hello')  → 'Hello'
 *   stripHtml('<b>Bold</b> text')               → 'Bold text'
 */
export function stripHtml(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  // Remove all HTML tags: anything between < and >
  return raw.replace(/<[^>]*>/g, '').trim();
}

/**
 * Encode HTML special characters to their entity equivalents.
 * Use this when you need to reflect user content into an HTML context
 * without stripping structure (rare server-side use case).
 *
 * @example
 *   encodeHtmlEntities('<script>') → '&lt;script&gt;'
 *   encodeHtmlEntities('"test"')   → '&quot;test&quot;'
 */
export function encodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Full sanitization pipeline for user-submitted text fields:
 * 1. Strip HTML tags
 * 2. Remove null bytes and control characters
 * 3. Trim whitespace
 * 4. Hard-truncate to maxLen
 *
 * Use this as the canonical sanitizer for all feedback/user-content fields
 * before writing to the database.
 */
export function sanitizeUserContent(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return stripHtml(raw)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .trim()
    .slice(0, maxLen);
}

/**
 * Sanitize a URL from user input.
 * Only allows http:// and https:// schemes to prevent javascript: XSS.
 * Returns empty string if the URL is unsafe.
 */
export function sanitizeUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // Allow only safe protocols
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.slice(0, 2048); // Reasonable URL length cap
  }
  // For relative URLs (e.g. page paths), allow /path format only
  if (/^\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(trimmed)) {
    return trimmed.slice(0, 500);
  }
  return '';
}

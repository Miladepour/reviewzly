export const REVIEW_SITE_ORIGIN = 'https://reviewzly.com';

/** Canonical review portal URL — always https + /review/ path. */
export function buildReviewLink(shortCode) {
  return `${REVIEW_SITE_ORIGIN}/review/${shortCode}`;
}

export function buildOptOutLink(businessId) {
  return `${REVIEW_SITE_ORIGIN}/opt-out?b=${businessId}`;
}

/**
 * Rewrites legacy reviewzly.com/r/… and bare-domain links to https://reviewzly.com/review/…
 * Safe to run on every outbound SMS (client + edge).
 */
export function normalizeReviewLinksInMessage(message, shortCode) {
  if (!message) return message;

  let result = message;

  if (shortCode) {
    result = result.replace(/\{\{review_link\}\}/gi, buildReviewLink(shortCode));
  }

  result = result
    .replace(/https?:\/\/reviewzly\.com\/r\/([a-zA-Z0-9]+)/gi, (_, code) => buildReviewLink(code))
    .replace(/reviewzly\.com\/r\/([a-zA-Z0-9]+)/gi, (_, code) => buildReviewLink(code))
    .replace(/http:\/\/reviewzly\.com\/review\/([a-zA-Z0-9]+)/gi, (_, code) => buildReviewLink(code))
    .replace(/reviewzly\.com\/review\/([a-zA-Z0-9]+)/gi, (_, code) => buildReviewLink(code));

  return result;
}

/** Replace hardcoded review URLs in saved templates with the {{review_link}} token. */
export function sanitizeReviewSmsTemplate(template) {
  if (!template) return template;
  return template
    .replace(/https?:\/\/reviewzly\.com\/r\/[a-zA-Z0-9]+/gi, '{{review_link}}')
    .replace(/reviewzly\.com\/r\/[a-zA-Z0-9]+/gi, '{{review_link}}')
    .replace(/https?:\/\/reviewzly\.com\/review\/[a-zA-Z0-9]+/gi, '{{review_link}}')
    .replace(/reviewzly\.com\/review\/[a-zA-Z0-9]+/gi, '{{review_link}}');
}

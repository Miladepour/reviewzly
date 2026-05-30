export const REVIEW_SITE_ORIGIN = 'https://reviewzly.com';

export function buildReviewLink(shortCode) {
  return `${REVIEW_SITE_ORIGIN}/review/${shortCode}`;
}

export function buildOptOutLink(businessId) {
  return `${REVIEW_SITE_ORIGIN}/opt-out?b=${businessId}`;
}

/** Collapse https://https://… mistakes from legacy normalizer runs. */
export function collapseDuplicateProtocols(message) {
  return message.replace(/(?:https:\/\/)+/gi, 'https://');
}

/**
 * Fix legacy reviewzly.com/r/… links only. Never rewrites URLs that already
 * start with https://reviewzly.com/review/
 */
export function normalizeReviewLinksInMessage(message, shortCode) {
  if (!message) return message;

  let result = message;

  if (shortCode) {
    result = result.replace(/\{\{review_link\}\}/gi, buildReviewLink(shortCode));
  }

  // Legacy /r/ slug (with or without protocol)
  result = result.replace(
    /https?:\/\/reviewzly\.com\/r\/([a-zA-Z0-9]+)/gi,
    (_, code) => buildReviewLink(code)
  );
  result = result.replace(
    /(^|[^\w/])reviewzly\.com\/r\/([a-zA-Z0-9]+)/gi,
    (_, pre, code) => `${pre}${buildReviewLink(code)}`
  );

  // Bare domain /review/ without https — do NOT match inside https://reviewzly.com/…
  result = result.replace(
    /(^|[^:/])reviewzly\.com\/review\/([a-zA-Z0-9]+)/gi,
    (_, pre, code) => `${pre}${buildReviewLink(code)}`
  );

  return collapseDuplicateProtocols(result);
}

export function sanitizeReviewSmsTemplate(template) {
  if (!template) return template;
  return template
    .replace(/https?:\/\/reviewzly\.com\/r\/[a-zA-Z0-9]+/gi, '{{review_link}}')
    .replace(/reviewzly\.com\/r\/[a-zA-Z0-9]+/gi, '{{review_link}}')
    .replace(/https?:\/\/reviewzly\.com\/review\/[a-zA-Z0-9]+/gi, '{{review_link}}')
    .replace(/reviewzly\.com\/review\/[a-zA-Z0-9]+/gi, '{{review_link}}');
}

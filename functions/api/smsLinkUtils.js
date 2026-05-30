/** Keep in sync with src/utils/smsLinks.js */

const ORIGIN = 'https://reviewzly.com';

function buildReviewLink(shortCode) {
  return `${ORIGIN}/review/${shortCode}`;
}

function collapseDuplicateProtocols(message) {
  return message.replace(/(?:https:\/\/)+/gi, 'https://');
}

export function normalizeReviewLinksInMessage(message, shortCode) {
  if (!message) return message;

  let result = message;

  if (shortCode) {
    result = result.replace(/\{\{review_link\}\}/gi, buildReviewLink(shortCode));
  }

  result = result.replace(
    /https?:\/\/reviewzly\.com\/r\/([a-zA-Z0-9]+)/gi,
    (_, code) => buildReviewLink(code)
  );
  result = result.replace(
    /(^|[^\w/])reviewzly\.com\/r\/([a-zA-Z0-9]+)/gi,
    (_, pre, code) => `${pre}${buildReviewLink(code)}`
  );
  result = result.replace(
    /(^|[^:/])reviewzly\.com\/review\/([a-zA-Z0-9]+)/gi,
    (_, pre, code) => `${pre}${buildReviewLink(code)}`
  );

  return collapseDuplicateProtocols(result);
}

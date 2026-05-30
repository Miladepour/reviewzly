/** @typedef {{ normalizeReviewLinksInMessage: (msg: string, shortCode?: string) => string }} SmsLinks */

/** Keep in sync with src/utils/smsLinks.js — duplicated for Cloudflare edge (no bundler import). */
export function normalizeReviewLinksInMessage(message, shortCode) {
  if (!message) return message;

  const origin = 'https://reviewzly.com';
  const canonical = shortCode ? `${origin}/review/${shortCode}` : null;

  let result = message;
  if (canonical) {
    result = result.replace(/\{\{review_link\}\}/gi, canonical);
  }

  return result
    .replace(/https?:\/\/reviewzly\.com\/r\/([a-zA-Z0-9]+)/gi, (_, code) => `${origin}/review/${code}`)
    .replace(/reviewzly\.com\/r\/([a-zA-Z0-9]+)/gi, (_, code) => `${origin}/review/${code}`)
    .replace(/http:\/\/reviewzly\.com\/review\/([a-zA-Z0-9]+)/gi, (_, code) => `${origin}/review/${code}`)
    .replace(/reviewzly\.com\/review\/([a-zA-Z0-9]+)/gi, (_, code) => `${origin}/review/${code}`);
}

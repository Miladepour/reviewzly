/**
 * Review portal links for SMS.
 *
 * UK carriers often block URLs that look like anonymous shorteners (e.g. reviewzly.com/r/abc123).
 * Use a full https URL with a descriptive /review/ path — NOT a bare domain or /r/ slug.
 * Do NOT put the Google review link in {{review_link}}; that skips the 5-star gate.
 * Google (g.page) links are only sent after a 5-star rating via the reward SMS flow.
 */
export function buildReviewLink(shortCode, origin = 'https://reviewzly.com') {
  const base = origin.replace(/\/$/, '');
  return `${base}/review/${shortCode}`;
}

export function buildOptOutLink(businessId, origin = 'https://reviewzly.com') {
  const base = origin.replace(/\/$/, '');
  return `${base}/opt-out?b=${businessId}`;
}

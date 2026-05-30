/** Review links without https:// — UK carriers often block URLs in SMS from generic senders. */
export function buildReviewLink(shortCode) {
  return `reviewzly.com/r/${shortCode}`;
}

export function buildOptOutLink(businessId) {
  return `reviewzly.com/opt-out?b=${businessId}`;
}

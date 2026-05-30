import { supabase } from '../supabaseClient';
import { buildReviewLink, buildOptOutLink } from './smsLinks';

/** Voodoo requires ≥120s lead time; use 3 minutes for reliable spacing. */
const REVIEW_SCHEDULE_SECONDS = 180;

function buildSmsFromTemplate(template, { bData, clientName, clientData, businessId }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://reviewzly.com';
  return template
    .replace(/{{business_name}}/g, bData.name || 'Our Business')
    .replace(/{{client_name}}/g, clientName || 'there')
    .replace(/{{review_link}}/g, buildReviewLink(clientData.short_code, origin))
    .replace(/{{unsubscribe_link}}/g, buildOptOutLink(businessId, origin));
}

async function logComm(clientId, businessId, text) {
  await supabase.from('communications').insert({
    client_id: clientId,
    business_id: businessId,
    type: 'BULK_CAMPAIGN',
    text,
    is_outbound: true,
  });
}

async function sendSms({ destPhone, msg, clientName, session, scheduledDateTime }) {
  const body = { dest: destPhone, msg, clientName };
  if (scheduledDateTime) body.scheduledDateTime = scheduledDateTime;

  const res = await fetch('/api/send_sms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let detail = '';
  let scheduled = false;
  try {
    const parsed = await res.json();
    detail = parsed.voodooMessageId ? ` ref:${parsed.voodooMessageId}` : '';
    if (parsed.voodooScheduledAt) {
      detail += ` at:${new Date(parsed.voodooScheduledAt * 1000).toISOString()}`;
    }
    scheduled = !!parsed.scheduled;
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, detail, scheduled };
}

async function advanceToFollowUp(clientId, bData) {
  const followDays = bData.follow_up_days || 7;
  const nextFollowUp = new Date();
  nextFollowUp.setDate(nextFollowUp.getDate() + followDays);
  await supabase
    .from('clients')
    .update({
      drip_step: 2,
      next_action_time: nextFollowUp.toISOString(),
    })
    .eq('id', clientId);
}

/**
 * Sends welcome and/or review SMS on client add.
 * When delay is 0: welcome immediately, review scheduled ~2 min later (separate messages,
 * spaced per Voodoo/carrier rules — URLs in SMS often fail when sent back-to-back).
 */
export async function dispatchOnboardingSms({
  delayHours,
  bData,
  clientData,
  clientName,
  cleanPhone,
  session,
  businessId,
}) {
  const delay = Number(delayHours);
  const destPhone = cleanPhone.replace(/[^0-9]/g, '');
  const templateCtx = { bData, clientName, clientData, businessId };

  const welcomeTemplate = bData?.welcome_sms?.trim() || '';
  const reviewTemplate = bData?.review_sms?.trim() || '';
  const welcomeMsg = welcomeTemplate ? buildSmsFromTemplate(welcomeTemplate, templateCtx) : '';
  const reviewMsg = reviewTemplate ? buildSmsFromTemplate(reviewTemplate, templateCtx) : '';

  const logs = [];

  if (welcomeMsg) {
    const { ok, status, detail } = await sendSms({
      destPhone,
      msg: welcomeMsg,
      clientName,
      session,
    });
    if (ok) {
      logs.push(`[WELCOME SUBMITTED]${detail} ${welcomeMsg}`);
    } else if (status === 402) {
      logs.push('[WELCOME BLOCKED] Insufficient SMS credits.');
    } else {
      logs.push(`[WELCOME BLOCKED] HTTP ${status}. ${welcomeMsg}`);
    }
  }

  if (delay === 0 && reviewMsg) {
    const scheduledDateTime = Math.floor(Date.now() / 1000) + REVIEW_SCHEDULE_SECONDS;
    const { ok, status, detail } = await sendSms({
      destPhone,
      msg: reviewMsg,
      clientName,
      session,
      scheduledDateTime,
    });
    if (ok) {
      await advanceToFollowUp(clientData.id, bData);
      logs.push(
        `[REVIEW SCHEDULED ~3 MIN]${detail} ${reviewMsg}`
      );
    } else if (status === 402) {
      logs.push('[REVIEW BLOCKED] Insufficient SMS credits for review message.');
    } else {
      logs.push(`[REVIEW BLOCKED] HTTP ${status}. ${reviewMsg}`);
    }
  } else if (delay === 0 && !reviewMsg) {
    await logComm(
      clientData.id,
      businessId,
      '[REVIEW SKIPPED] No review SMS template configured in Settings.'
    );
  }

  return { logs };
}

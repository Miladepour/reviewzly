import { supabase } from '../supabaseClient';
import { buildReviewLink, buildOptOutLink } from './smsLinks';

const DEFAULT_INVITE_SMS =
  'Hello, Welcome to {{business_name}} Members Club. Please review us here and share your experience with us: {{review_link}}';

function buildSmsFromTemplate(template, { bData, clientName, clientData, businessId }) {
  return template
    .replace(/{{business_name}}/g, bData.name || 'Our Business')
    .replace(/{{client_name}}/g, clientName || 'there')
    .replace(/{{review_link}}/g, buildReviewLink(clientData.short_code))
    .replace(/{{unsubscribe_link}}/g, buildOptOutLink(businessId));
}

async function sendSms({ destPhone, msg, clientName, session, shortCode }) {
  const res = await fetch('/api/send_sms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dest: destPhone, msg, clientName, shortCode }),
  });

  let detail = '';
  try {
    const parsed = await res.json();
    detail = parsed.voodooMessageId ? ` ref:${parsed.voodooMessageId}` : '';
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, detail };
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
 * Sends a single immediate "Invite" SMS when a client is added.
 * One message (welcome + review combined) carrying {{review_link}} to the
 * Reviewzly rating page. No Voodoo scheduling — matches the known-good
 * immediate-send behaviour. The 5-star → Google reward flow and the 7-day
 * follow-up drip are unchanged.
 */
export async function dispatchOnboardingSms({
  bData,
  clientData,
  clientName,
  cleanPhone,
  session,
  businessId,
}) {
  const destPhone = cleanPhone.replace(/[^0-9]/g, '');
  const templateCtx = { bData, clientName, clientData, businessId };

  const inviteTemplate =
    bData?.invite_sms?.trim() ||
    bData?.welcome_sms?.trim() ||
    bData?.review_sms?.trim() ||
    DEFAULT_INVITE_SMS;
  const inviteMsg = buildSmsFromTemplate(inviteTemplate, templateCtx);

  const logs = [];

  const { ok, status, detail } = await sendSms({
    destPhone,
    msg: inviteMsg,
    clientName,
    session,
    shortCode: clientData.short_code,
  });

  if (ok) {
    await advanceToFollowUp(clientData.id, bData);
    logs.push(`[INVITE SUBMITTED]${detail} ${inviteMsg}`);
  } else if (status === 402) {
    logs.push('[INVITE BLOCKED] Insufficient SMS credits.');
  } else {
    logs.push(`[INVITE BLOCKED] HTTP ${status}. ${inviteMsg}`);
  }

  return { logs };
}

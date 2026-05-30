import { supabase } from '../supabaseClient';

function buildSmsFromTemplate(template, { bData, clientName, clientData, businessId }) {
  const origin = window.location.origin;
  return template
    .replace(/{{business_name}}/g, bData.name || 'Our Business')
    .replace(/{{client_name}}/g, clientName || 'there')
    .replace(/{{review_link}}/g, `${origin}/r/${clientData.short_code}`)
    .replace(/{{unsubscribe_link}}/g, `${origin}/opt-out?b=${businessId}`);
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

async function sendSms({ destPhone, msg, clientName, session }) {
  const res = await fetch('/api/send_sms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dest: destPhone, msg, clientName }),
  });
  let detail = '';
  try {
    const body = await res.json();
    detail = body.voodooMessageId ? ` (ref: ${body.voodooMessageId})` : '';
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
 * Sends welcome and/or review SMS on client add.
 * When delay is 0 and both templates exist, sends ONE combined SMS so carriers
 * do not drop a second message fired in the same second.
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

  // Zero delay + both templates → single SMS (avoids carrier filtering on back-to-back sends)
  if (delay === 0 && welcomeMsg && reviewMsg) {
    const combined = `${welcomeMsg}\n\n${reviewMsg}`;
    const { ok, status, detail } = await sendSms({
      destPhone,
      msg: combined,
      clientName,
      session,
    });
    if (ok) {
      await advanceToFollowUp(clientData.id, bData);
      logs.push(`[AUTO-DISPATCH SUCCESS]${detail} ${combined}`);
    } else if (status === 402) {
      logs.push('[ONBOARDING BLOCKED] Insufficient SMS credits.');
    } else {
      logs.push(`[ONBOARDING BLOCKED] Combined welcome+review failed (HTTP ${status}).`);
    }
    return { logs };
  }

  if (welcomeMsg) {
    const { ok, status, detail } = await sendSms({
      destPhone,
      msg: welcomeMsg,
      clientName,
      session,
    });
    if (ok) {
      logs.push(`[AUTO-DISPATCH SUCCESS]${detail} ${welcomeMsg}`);
    } else if (status === 402) {
      logs.push('[AUTO-DISPATCH BLOCKED] Insufficient SMS Credits.');
    } else {
      logs.push(`[AUTO-DISPATCH BLOCKED] ${welcomeMsg}`);
    }
  }

  if (delay === 0 && reviewMsg) {
    const { ok, status, detail } = await sendSms({
      destPhone,
      msg: reviewMsg,
      clientName,
      session,
    });
    if (ok) {
      await advanceToFollowUp(clientData.id, bData);
      logs.push(`[AUTO-DISPATCH SUCCESS]${detail} ${reviewMsg}`);
    } else if (status === 402) {
      logs.push('[REVIEW DISPATCH BLOCKED] Insufficient SMS credits for review message.');
    } else {
      logs.push(`[REVIEW DISPATCH BLOCKED] API status ${status}.`);
    }
  } else if (delay === 0 && !reviewMsg) {
    await logComm(
      clientData.id,
      businessId,
      '[REVIEW DISPATCH SKIPPED] No review SMS template configured in Settings.'
    );
  }

  return { logs };
}

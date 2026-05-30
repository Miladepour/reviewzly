import { supabase } from '../supabaseClient';

async function logReviewComm(clientId, businessId, text) {
  await supabase.from('communications').insert({
    client_id: clientId,
    business_id: businessId,
    type: 'BULK_CAMPAIGN',
    text,
    is_outbound: true,
  });
}

/**
 * When delay_hours_for_invite is 0, send the review SMS right after welcome
 * (cron only runs on a schedule and would not feel instant).
 * On success, advances drip to step 2 so cron sends follow-up only.
 */
export async function dispatchImmediateReviewSms({
  delayHours,
  bData,
  clientData,
  clientName,
  destPhoneRaw,
  session,
  businessId,
}) {
  const delay = Number(delayHours);
  if (delay !== 0) {
    return { dispatched: false, reason: 'scheduled' };
  }

  const reviewTemplate = bData?.review_sms;
  if (!reviewTemplate || reviewTemplate.trim() === '') {
    await logReviewComm(
      clientData.id,
      businessId,
      '[REVIEW DISPATCH SKIPPED] No review SMS template configured in Settings.'
    );
    return { dispatched: false, reason: 'no_template' };
  }

  const origin = window.location.origin;
  const finalSms = reviewTemplate
    .replace(/{{business_name}}/g, bData.name || 'Our Business')
    .replace(/{{client_name}}/g, clientName || 'there')
    .replace(/{{review_link}}/g, `${origin}/r/${clientData.short_code}`)
    .replace(/{{unsubscribe_link}}/g, `${origin}/opt-out?b=${businessId}`);

  const destPhone = destPhoneRaw.replace(/[^0-9]/g, '');

  try {
    const vRes = await fetch('/api/send_sms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dest: destPhone, msg: finalSms, clientName }),
    });

    if (vRes.ok) {
      const followDays = bData.follow_up_days || 7;
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + followDays);

      await supabase
        .from('clients')
        .update({
          drip_step: 2,
          next_action_time: nextFollowUp.toISOString(),
        })
        .eq('id', clientData.id);

      await logReviewComm(
        clientData.id,
        businessId,
        `[AUTO-DISPATCH SUCCESS] ${finalSms}`
      );

      return { dispatched: true, finalSms };
    }

    if (vRes.status === 402) {
      await logReviewComm(
        clientData.id,
        businessId,
        '[REVIEW DISPATCH BLOCKED] Insufficient SMS credits for review message.'
      );
      return { dispatched: false, reason: 'no_credits', finalSms };
    }

    const errDetail = await vRes.text().catch(() => '');
    await logReviewComm(
      clientData.id,
      businessId,
      `[REVIEW DISPATCH BLOCKED] API status ${vRes.status}${errDetail ? `: ${errDetail.slice(0, 120)}` : ''}`
    );
    return { dispatched: false, reason: 'api_error', finalSms, status: vRes.status };
  } catch {
    await logReviewComm(
      clientData.id,
      businessId,
      '[REVIEW DISPATCH ERROR] Network failed reaching /api/send_sms.'
    );
    return { dispatched: false, reason: 'network_error' };
  }
}

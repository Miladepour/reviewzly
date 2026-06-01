import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../contexts/ToastContext';

const ManagePlan = () => {
  const addToast = useToast();
  
  // State
  const [activePlan, setActivePlan] = useState('Loading...');
  const [invoices, setInvoices] = useState([]);
  const [subInfo, setSubInfo] = useState(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  
  // Checkout & Cancellation State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customInvites, setCustomInvites] = useState(50);

  const fetchIdentity = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase.from('businesses').select('active_plan, stripe_subscription_id').eq('id', session.user.id).single();
        if (data && data.active_plan) {
            setActivePlan(data.active_plan);
        } else {
            setActivePlan('Free Tier');
        }
    } catch(e) {}
  };

  const fetchInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/stripe/invoices', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
            const result = await res.json();
            setInvoices(result.invoices || []);
            setSubInfo(result.subscription || null);
        }
    } catch(err) {
        addToast("Network Error loading billing history.", "error");
    } finally {
        setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
     fetchIdentity();
     fetchInvoices();
  }, []);

  const handleCheckout = async (creditAmount, options = {}) => {
    const { custom = false } = options;
    setIsCheckingOut(true);
    addToast(`Initializing secure connection to Stripe...`, "success");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication missing.");

      const body = custom ? { customInvites: creditAmount } : { creditAmount };
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        let errContext = "Hardware rejection.";
        try { const errData = await res.json(); errContext = errData.error; } catch(e){}
        throw new Error(errContext);
      }

      const { url } = await res.json();
      window.location.href = url; // Push user to sandbox
    } catch(err) {
      addToast(err.message, "error");
      setIsCheckingOut(false);
    }
  };

  const openBillingPortal = async () => {
    setIsCheckingOut(true);
    addToast("Opening secure billing portal...", "success");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication missing.");
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not open billing portal.");
      window.location.href = body.url;
    } catch (err) {
      addToast(err.message, "error");
      setIsCheckingOut(false);
    }
  };

  const executeCancellation = async (e) => {
      e.preventDefault();
      if (!cancelReason) return addToast("Please provide a reason.", "warning");
      setIsCancelling(true);
      
      try {
          const { data: { session } } = await supabase.auth.getSession();
          
          // 1. Submit Secure Feedback via RLS
          await supabase.from('cancellation_feedback').insert([{
              business_id: session.user.id,
              reason: cancelReason
          }]);
          
          // 2. Erase Subscription from Edge Protocol
          const res = await fetch('/api/stripe/cancel', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session.access_token}` }
          });

          if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.details || body.error || `Cancellation failed (HTTP ${res.status}).`);
          }
          
          setActivePlan('Cancelled');
          setShowCancelModal(false);
          addToast("Your subscription was permanently terminated.", "success");
          
      } catch (err) {
          addToast(err.message, "error");
      } finally {
          setIsCancelling(false);
      }
  };

  return (
    <div className="flex flex-col gap-8 flex-1">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-display-xl mb-1">Manage Plan</h1>
          <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
            Current Active Tier: <strong style={{ color: 'var(--primary)' }}>{activePlan}</strong>
          </p>
          {subInfo && subInfo.cancel_at_period_end && (subInfo.cancel_at || subInfo.current_period_end) && (
            <p className="text-body" style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: '#b45309', fontWeight: 600 }}>
              ⚠️ Cancels on {new Date((subInfo.cancel_at || subInfo.current_period_end) * 1000).toLocaleDateString()} — active until then.
            </p>
          )}
          {subInfo && !subInfo.cancel_at_period_end && subInfo.current_period_end && (
            <p className="text-body" style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: 'var(--on-surface-variant)' }}>
              Renews on {new Date(subInfo.current_period_end * 1000).toLocaleDateString()}.
            </p>
          )}
        </div>
        {activePlan !== 'Free Tier' && activePlan !== 'Cancelled' && activePlan !== 'Loading...' && (
            <button
                onClick={openBillingPortal}
                disabled={isCheckingOut}
                style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: 'transparent',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: isCheckingOut ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}
            >
                Manage Billing & Cancel
            </button>
        )}
      </div>

      {/* TIER UPGRADE SYSTEM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[
            {
              credits: 50,
              name: 'Starter Spark',
              price: '£35 / mo',
              desc: 'Perfect for small businesses capturing essential reviews natively.',
              exclusive: false
            },
            {
              credits: 150,
              name: 'Growth Rocket',
              price: '£90 / mo',
              desc: 'For high-velocity outfits needing aggressive client aggregation.',
              exclusive: false,
              recommended: true
            },
            {
              credits: 500,
              name: 'Enterprise Titan',
              price: '£290 / mo',
              desc: 'Full-scale operational matrix with dedicated channels.',
              exclusive: true
            }
        ].map(tier => (
            <div key={tier.credits} className="card" style={{ padding: '2rem', textAlign: 'center', transition: 'transform 0.2s, border-color 0.2s', border: activePlan === tier.name ? '2px solid var(--primary)' : (tier.recommended ? '2px solid #f59e0b' : '2px solid transparent'), cursor: 'pointer', position: 'relative' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = activePlan === tier.name ? 'var(--primary)' : (tier.recommended ? '#f59e0b' : 'transparent')}>
              {activePlan === tier.name ? (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary)', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 1, whiteSpace: 'nowrap' }}>
                      Current Plan
                  </div>
              ) : tier.recommended && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#f59e0b', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 1, whiteSpace: 'nowrap' }}>
                      ⭐ Recommended
                  </div>
              )}
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>{tier.name}</h3>
              <p style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.5rem' }}>{tier.price}</p>
              
              <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--outline-variant)', borderTop: '1px solid var(--outline-variant)', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>{tier.desc}</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--on-surface)', marginTop: '0.5rem' }}>{tier.credits} invites / month <span style={{fontSize:'0.8rem', fontWeight:'normal'}}>(Rollover enabled)</span></p>
                  {tier.exclusive && (
                      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', marginTop: '0.5rem' }}>2-Way SMS Available (Requires Dedicated Phone)</p>
                  )}
              </div>
              
              <button 
                  type="button"
                  onClick={() => handleCheckout(tier.credits)} 
                  disabled={isCheckingOut || activePlan === tier.name}
                  className={activePlan === tier.name ? 'btn-secondary' : 'btn-primary'}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700, cursor: isCheckingOut ? 'wait' : 'pointer', opacity: isCheckingOut ? 0.6 : 1 }}
              >
                  {isCheckingOut ? 'Routing...' : (activePlan === tier.name ? 'Active' : 'Subscribe')}
              </button>
            </div>
        ))}
      </div>

      {/* CUSTOM TOP-UP (one-time, £1 per invite) */}
      <div className="card" style={{ padding: '2rem', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div style={{ flex: '1 1 280px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>Need extra invites?</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
              Buy a one-time top-up at <strong>£1 per invite</strong>. Added instantly — no subscription change.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Invites</label>
              <input
                type="number"
                min="1"
                max="10000"
                value={customInvites}
                onChange={(e) => setCustomInvites(e.target.value)}
                style={{ padding: '0.75rem', width: '120px', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', fontSize: '1rem', fontWeight: 700 }}
              />
            </div>
            <div style={{ textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Total</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)' }}>£{Math.max(0, Math.floor(Number(customInvites) || 0))}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const n = Math.floor(Number(customInvites) || 0);
                if (n < 1) return addToast("Enter at least 1 invite.", "warning");
                handleCheckout(n, { custom: true });
              }}
              disabled={isCheckingOut}
              className="btn-primary"
              style={{ padding: '0.85rem 1.75rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700, cursor: isCheckingOut ? 'wait' : 'pointer', opacity: isCheckingOut ? 0.6 : 1 }}
            >
              {isCheckingOut ? 'Routing...' : 'Buy Invites'}
            </button>
          </div>
        </div>
      </div>

      {/* INVOICES TABLE */}
      <div className="card mt-4">
        <h2 className="text-title-lg mb-4">Invoices & Billing History</h2>
        {isLoadingInvoices ? (
            <p className="text-body">Retrieving historical ledgers securely from Stripe...</p>
        ) : invoices.length === 0 ? (
            <p className="text-body" style={{ color: 'var(--on-surface-variant)' }}>No transaction history found on this account.</p>
        ) : (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--outline-variant)' }}>
                            <th style={{ padding: '1rem', color: 'var(--on-surface-variant)' }}>Date</th>
                            <th style={{ padding: '1rem', color: 'var(--on-surface-variant)' }}>Description</th>
                            <th style={{ padding: '1rem', color: 'var(--on-surface-variant)' }}>Status</th>
                            <th style={{ padding: '1rem', color: 'var(--on-surface-variant)' }}>Amount</th>
                            <th style={{ padding: '1rem', color: 'var(--on-surface-variant)' }}>Receipt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((inv) => (
                            <tr key={inv.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                                <td style={{ padding: '1rem', fontWeight: '500' }}>{new Date(inv.created * 1000).toLocaleDateString()}</td>
                                <td style={{ padding: '1rem', color: 'var(--on-surface)' }}>{inv.description || '—'}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ backgroundColor: inv.status === 'paid' ? '#e8f5e9' : '#ffebee', color: inv.status === 'paid' ? '#2e7d32' : '#c62828', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', fontWeight: '700' }}>£{(inv.amount_paid / 100).toFixed(2)}</td>
                                <td style={{ padding: '1rem' }}>
                                    <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>Download PDF</a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* CANCELLATION MODAL */}
      {showCancelModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
              <div className="card" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--surface)', borderRadius: '1rem', padding: '2rem' }}>
                  <h3 className="text-display-md mb-2" style={{ color: 'var(--on-surface)', fontWeight: 800 }}>Manage Subscription</h3>
                  <p className="text-body mb-6" style={{ color: 'var(--on-surface-variant)' }}>Before you go, please let us know why you are considering canceling your active sequence.</p>
                  
                  <form onSubmit={executeCancellation}>
                      <div className="flex flex-col gap-2 mb-8">
                          <label className="text-label-sm" style={{ fontWeight: 600 }}>Primary Reason*</label>
                          <select 
                            value={cancelReason} 
                            onChange={(e) => setCancelReason(e.target.value)}
                            required
                            style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', width: '100%', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)', fontSize: '1rem' }}
                          >
                              <option value="" disabled>Select a reason...</option>
                              <option value="Too Expensive">It's too expensive</option>
                              <option value="Missing Features">Missing important features</option>
                              <option value="Switching Competitor">Switching to a competitor</option>
                              <option value="Not Enough Volume">Not sending enough SMS</option>
                              <option value="Technical Bugs">Encountered technical bugs</option>
                              <option value="Other">Other</option>
                          </select>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                          <button 
                            type="button" 
                            onClick={() => setShowCancelModal(false)} 
                            disabled={isCancelling}
                            style={{ 
                                padding: '1rem', 
                                borderRadius: '0.5rem', 
                                backgroundColor: 'var(--primary)', 
                                color: 'white', 
                                fontWeight: 700, 
                                fontSize: '1.05rem',
                                border: 'none', 
                                cursor: 'pointer',
                                transition: 'opacity 0.2s',
                                width: '100%'
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = 0.9}
                            onMouseOut={e => e.currentTarget.style.opacity = 1}
                          >
                            Keep Subscription Active
                          </button>

                          <button 
                            type="submit" 
                            disabled={isCancelling}
                            style={{ 
                                padding: '0.85rem', 
                                borderRadius: '0.5rem', 
                                backgroundColor: 'transparent', 
                                color: 'var(--on-surface-variant)', 
                                fontWeight: 600, 
                                fontSize: '0.95rem',
                                border: 'none', 
                                cursor: 'pointer',
                                transition: 'color 0.2s',
                                width: '100%'
                            }}
                            onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                            onMouseOut={e => e.currentTarget.style.color = 'var(--on-surface-variant)'}
                          >
                              {isCancelling ? 'Processing termination...' : 'Confirm Termination'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default ManagePlan;

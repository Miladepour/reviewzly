import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const SmsHub = () => {
  const addToast = useToast();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [senderId, setSenderId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // 1. Fetch Balances & Configuration
      const { data: bizData } = await supabase
        .from('businesses')
        .select('sms_credits, sms_sender_id')
        .eq('id', session.user.id)
        .single();
        
      if (bizData) {
        setCredits(bizData.sms_credits || 0);
        setSenderId(bizData.sms_sender_id || '');
      }

      // 2. Fetch Transmission Logs
      const { data: logsData, error: logsErr } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (logsErr) {
        addToast("SMS Logs not initialized yet: " + logsErr.message, "warning");
      } else if (logsData) {
        setLogs(logsData);
      }

    } catch (error) {
      addToast("Error fetching network statistics.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSenderId = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('businesses')
        .update({ sms_sender_id: senderId })
        .eq('id', session.user.id);
        
      if (error) {
        if (error.code === '23505') throw new Error("This Sender ID is already claimed heavily by another business. Please heavily abbreviate.");
        throw error;
      }
      
      setSaveMessage('Sender Mask activated successfully.');
    } catch (error) {
      setSaveMessage(error.message);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 4000);
    }
  };

  const handleCheckout = async (creditAmount) => {
    setIsCheckingOut(true);
    addToast(`Initializing secure connection to Stripe for ${creditAmount} credits...`, "success");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication missing.");

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ creditAmount })
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

  if (loading) return <div style={{ padding: '2rem' }}>Loading SMS command center...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--on-surface)', marginBottom: '0.5rem' }}>
          💬 SMS Command Center
        </h1>
        <p style={{ color: 'var(--on-surface-variant)' }}>
          Manage your global messaging identity and track outbound review request deliveries.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Credits Metric Card */}
        <div style={{ padding: '2rem', borderRadius: '1.5rem', backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2e7d32', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Available Balance
          </h2>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: '#1b5e20', lineHeight: 1 }}>
            {credits}
          </div>
          <p style={{ color: '#388e3c', marginTop: 'auto', paddingTop: '1rem', fontWeight: 600 }}>
            Active Transmission Credits
          </p>
        </div>

        {/* Sender ID Config Card */}
        <div style={{ padding: '2rem', borderRadius: '1.5rem', backgroundColor: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Transmission Identity</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
            This is exactly what appears on your client's mobile Caller ID. Max 11 characters.
          </p>
          
          <form onSubmit={handleSaveSenderId} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              maxLength={11}
              pattern="[A-Za-z0-9]+"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
              placeholder="e.g. Reviewzly"
              style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 700, borderRadius: '0.75rem', border: '2px solid var(--outline)', outline: 'none' }}
              required
            />
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary" 
              style={{ padding: '1rem', fontWeight: 700, borderRadius: '0.75rem' }}
            >
              {isSaving ? 'Synchronizing...' : 'Lock Identify'}
            </button>
            {saveMessage && (
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: saveMessage.includes('activated') ? '#e8f5e9' : '#ffebee', color: saveMessage.includes('activated') ? '#2e7d32' : '#c62828', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                {saveMessage}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Stripe Checkout Top-Up Packages */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '1rem' }}>Recharge Global Balance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            { credits: 100, price: '$5.00' },
            { credits: 250, price: '$10.00' },
            { credits: 500, price: '$18.00' }
          ].map(tier => (
            <div key={tier.credits} style={{ padding: '2rem', borderRadius: '1rem', border: '2px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', textAlign: 'center', transition: 'transform 0.2s, border-color 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--outline-variant)'}>
               <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>{tier.credits} SMS</h3>
               <p style={{ fontSize: '1.15rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '1.5rem' }}>{tier.price}</p>
               <button 
                  onClick={() => handleCheckout(tier.credits)} 
                  disabled={isCheckingOut}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700, opacity: isCheckingOut ? 0.6 : 1 }}
               >
                  {isCheckingOut ? 'Routing...' : 'Purchase Package'}
               </button>
            </div>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--on-surface)' }}>Transmission Ledger</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>Real-time logs of all outbound network traffic.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '1rem', border: '1px solid var(--outline-variant)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ backgroundColor: 'var(--surface-container-low)', borderBottom: '2px solid var(--outline-variant)' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Recipient Name</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Mobile End-point</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Network Status</th>
                <th style={{ padding: '1rem', fontWeight: 700, textAlign: 'center' }}>Cost</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📡</div>
                    <div style={{ fontWeight: 600 }}>No Outbound Transmissions Found</div>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Initiate a review request to see real-time routing analytics.</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{log.client_name}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{log.client_mobile}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '2rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        backgroundColor: log.status === 'Delivered' ? '#e8f5e9' : (log.status === 'Failed' ? '#ffebee' : '#fff3e0'),
                        color: log.status === 'Delivered' ? '#2e7d32' : (log.status === 'Failed' ? '#c62828' : '#ef6c00')
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                      -{log.credits_used}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default SmsHub;

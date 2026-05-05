import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../index.css';

const OptOut = () => {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('b');
  
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleUnsubscribe = async (e) => {
    e.preventDefault();
    
    if (!businessId) {
      setStatus('error');
      setErrorMessage('Invalid unsubscribe link. Missing business identifier.');
      return;
    }

    if (phone.length < 5) {
      setStatus('error');
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    setStatus('loading');
    
    try {
      // Call the secure RPC
      const { error } = await supabase.rpc('business_opt_out', {
        p_business_id: businessId,
        p_phone: phone
      });

      if (error) throw error;
      
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage('Failed to process unsubscribe request. Please ensure the number is correct.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface)', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
        
        {status === 'success' ? (
          <div>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E8F5E9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h2 className="text-title-lg mb-2">Unsubscribed</h2>
            <p className="text-body mb-0" style={{ color: 'var(--on-surface-variant)' }}>
              Your phone number has been successfully removed. You will no longer receive text messages from this business.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FFEBEE', color: '#c62828', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h2 className="text-title-lg mb-2">Opt-Out of SMS</h2>
            <p className="text-body mb-6" style={{ color: 'var(--on-surface-variant)' }}>
              Enter your mobile number below to stop receiving automated messages.
            </p>

            {status === 'error' && (
              <div style={{ backgroundColor: '#FFEBEE', color: '#c62828', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleUnsubscribe} className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-2">
                <label className="text-label-sm" style={{ fontWeight: 700 }}>Mobile Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +44 7700 900077"
                  required
                  style={{ padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', fontSize: '1rem' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: '1rem', marginTop: '0.5rem', backgroundColor: '#c62828' }}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Processing...' : 'Confirm Opt-Out'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptOut;

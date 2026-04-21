import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useToast } from '../contexts/ToastContext';
import { normalizePhone } from '../utils/formatters';

const Dashboard = () => {
  const addToast = useToast();
  // Local Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientDob, setClientDob] = useState('');
  
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  // Live Database Analytics State
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Carousel State & Navigation
  const navigate = useNavigate();
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [publicIndex, setPublicIndex] = useState(0);
  
  // SMS API State
  const [smsBalance, setSmsBalance] = useState('Syncing...');

  // Google Cache State
  const [googleStats, setGoogleStats] = useState({ rating: 0.0, total_reviews: 0 });
  const [googleReviews, setGoogleReviews] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setClients(data);
      }
      
      // Secondary Fetch: Native Database Credits
      const { data: businessData } = await supabase.from('businesses').select('*').eq('id', session.user.id).single();
      
      if (businessData) {
          setSmsBalance(businessData.sms_credits || 0);

          // Stale-While-Revalidate Google Caching Algorithm
          setGoogleStats({ rating: businessData.google_rating || 0.0, total_reviews: businessData.google_reviews_count || 0 });
          setGoogleReviews(businessData.google_reviews || []);

          const diff = Date.now() - new Date(businessData.google_last_synced_at || 0).getTime();
          const hoursPassed = diff / (1000 * 60 * 60);

          if (hoursPassed >= 24 && businessData.name) {
              fetch('/api/sync_google', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ businessName: businessData.name })
              }).then(r => r.json()).then(gData => {
                  if (gData.rating) {
                      supabase.from('businesses').update({
                          google_rating: gData.rating,
                          google_reviews_count: gData.total_reviews,
                          google_reviews: gData.reviews || [],
                          google_last_synced_at: new Date().toISOString()
                      }).eq('id', session.user.id).then(()=>{});
                      setGoogleStats({ rating: gData.rating, total_reviews: gData.total_reviews });
                      if (gData.reviews) setGoogleReviews(gData.reviews);
                  }
              }).catch(e => addToast("Background Cache Update Failed", "error"));
          }

      } else {
          setSmsBalance('No Data');
      }

    } catch (e) {
      addToast("Failed to fetch dashboard intelligence.", "error");
      setMessage(`Network Sync Error: Could not reliably reach Database. Please check connection.`);
      setTimeout(() => setMessage(''), 6000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Live Quick Add Mutation
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const cleanTargetPhone = normalizePhone(clientPhone);
      const isDuplicate = clients.some(c => normalizePhone(c.phone) === cleanTargetPhone);
      
      if (isDuplicate) {
          addToast("A client with this mobile number already exists in your system.", "error");
          setMessage("Blocked: Identical contact legally exists.");
          setIsSending(false);
          return;
      }
      
      // Fetch business settings safely isolated
      const { data: bData } = await supabase.from('businesses').select('*').eq('id', session.user.id).single();

      // Mathematically schedule the next action (Review Invite)
      const delayHours = bData?.delay_hours_for_invite || 2;
      const nextActionDate = new Date();
      nextActionDate.setHours(nextActionDate.getHours() + delayHours);

      // Physically insert the client into Postgres
      const { data: clientData, error } = await supabase.from('clients').insert([{
        business_id: session.user.id,
        name: clientName,
        phone: cleanTargetPhone,
        email: clientEmail || null,
        dob: clientDob || null,
        tags: ['Quick Add'],
        drip_step: 1,
        next_action_time: nextActionDate.toISOString()
      }]).select().single();

      if (error) throw error;

      // === NEW: Automated SMS Dispatch (Welcome Text Only) ===
      let dispatchLogText = `Client securely added. Review Invite aggressively queued for ${delayHours} hours from now.`;
      
      const welcomeTemplate = bData?.welcome_sms;
      
      if (welcomeTemplate && welcomeTemplate.trim() !== '') {
          // Parse dynamic template variables for the Welcome sequence
          let finalSms = welcomeTemplate
              .replace(/{{business_name}}/g, bData?.name || 'Our Business')
              .replace(/{{client_name}}/g, clientName || 'there');
              
          try {
             const destPhone = clientPhone.replace(/[^0-9]/g, '');
             const vRes = await fetch('/api/send_sms', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dest: destPhone,
                    msg: finalSms,
                    clientName: clientName
                })
             });
             
             if (vRes.ok) {
                 dispatchLogText = `[AUTO-DISPATCH SUCCESS] ` + finalSms;
             } else if (vRes.status === 402) {
                 dispatchLogText = `[AUTO-DISPATCH BLOCKED] Insufficient SMS Credits.`;
             } else {
                 dispatchLogText = `[AUTO-DISPATCH BLOCKED] ` + finalSms;
                 addToast("API failed to deliver the automated payload.", "warning");
             }
          } catch(err) {
             addToast("Dispatch Error targeting API payload: " + err.message, "error");
             dispatchLogText = `[AUTO-DISPATCH ERROR] Network proxy securely failed.`;
          }
      }

      // Automatically log the result to the history timeline
      await supabase.from('communications').insert([{
         client_id: clientData.id,
         business_id: session.user.id,
         type: 'BULK_CAMPAIGN',
         text: dispatchLogText,
         is_outbound: true
      }]);

      setMessage('Client securely vaulted into queue. Drip campaign successfully initialized!');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setClientDob('');
      
      // Seamlessly refetch dashboard numbers
      await fetchDashboardData();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      addToast('Error saving client. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // ------------------------------------------
  // LIVE ANALYTICS ALGORITHMS
  // ------------------------------------------
  const totalClients = clients.length;
  
  // Isolate clients who have actually left feedback
  const ratedClients = clients.filter(c => c.rating_status && c.rating_status !== 'Pending');
  const fiveStarGoogleCount = ratedClients.filter(c => c.rating_status.includes('5-Star')).length;
  const internallyCaughtCount = ratedClients.filter(c => c.rating_status.includes('Captured')).length;
  
  const totalRatings = ratedClients.length;
  const googlePercent = totalRatings > 0 ? Math.round((fiveStarGoogleCount / totalRatings) * 100) : 0;
  const internalPercent = totalRatings > 0 ? Math.round((internallyCaughtCount / totalRatings) * 100) : 0;

  // Render recent 3
  const recentFeedbackList = ratedClients.slice(0, 3);

  if (isLoading) return <div style={{ padding: '2rem' }}>Processing live analytics...</div>;

  return (
    <>
      <div className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4 mb-6">
        <div>
          <h1 className="text-display-xl mb-1">Dashboard</h1>
          <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
            Welcome back. Here is your operational overview.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="tag-light-green" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
             Voodoo SMS Active
          </div>
        </div>
      </div>

      {/* Unified 3-Metric Box */}
      <div className="card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex flex-col md-flex-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)' }}>
          
          <div style={{ padding: '2rem', borderRight: '1px solid var(--outline-variant)' }}>
            <p className="val-sub">Total Clients</p>
            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              <h2 className="text-display-xl" style={{ fontSize: '2.5rem' }}>{totalClients}</h2>
              {totalClients > 0 && <span className="tag-green-text">Live Database</span>}
            </div>
          </div>
          
          <div style={{ padding: '2rem', borderRight: '1px solid var(--outline-variant)' }}>
            <p className="val-sub">Public Google Rating</p>
            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              <h2 className="text-display-xl" style={{ fontSize: '2.5rem' }}>{Number(googleStats.rating).toFixed(1)}</h2>
              <div className="flex flex-col text-right">
                <div className="flex justify-end text-title-lg" style={{ color: 'var(--primary)', letterSpacing: '2px' }}>
                  {Array.from({ length: Math.round(googleStats.rating || 5) }).map((_, i) => '★').join('')}
                </div>
                <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>{googleStats.total_reviews} Reviews</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '2rem', backgroundColor: '#e8f5e9', display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
            <div className="flex flex-col justify-between">
              <p className="val-sub" style={{ color: '#2e7d32' }}>Platform SMS Balance</p>
              <h2 className="text-display-xl" style={{ fontSize: '3rem', color: '#1b5e20', lineHeight: 1 }}>{smsBalance}</h2>
            </div>
            
            <div className="flex flex-col gap-2 items-end justify-center">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#c8e6c9', color: '#1b5e20', padding: '0.35rem 0', borderRadius: '0.5rem', textAlign: 'center', width: '100px' }}>
                 {smsBalance === 'Syncing...' ? 'Pending' : 'Live System'}
              </span>
              
              {smsBalance !== 'Syncing...' && smsBalance !== 'No Data' && Number(smsBalance) < 50 && (
                 <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dc2626', color: 'white', padding: '0.35rem 0', borderRadius: '0.5rem', textAlign: 'center', width: '100px' }}>
                   Low Credit
                 </span>
              )}
              
              <button 
                 type="button" 
                 style={{ backgroundColor: '#2e7d32', color: 'white', border: 'none', padding: '0.35rem 0', fontSize: '0.75rem', fontWeight: 700, borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'center', width: '100px' }} 
                 onClick={() => { navigate('/dashboard/plan'); }}
              >
                 Top-Up Credit
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Add Client (Full Width Row) */}
      <div className="card mb-8">
        <h3 className="text-title-lg mb-2">Live Quick Add & Invite</h3>
        <p className="text-body mb-6" style={{ fontSize: '0.85rem' }}>Instantly insert a new record into Postgres and dispatch their pipeline.</p>
        
        <form onSubmit={handleQuickAdd} className="flex gap-4 flex-wrap items-end" style={{ width: '100%' }}>
          <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '200px' }}>
            <label className="text-label-sm">Name*</label>
            <input 
              type="text" 
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%' }}
              placeholder="e.g. Sarah Smith"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '200px' }}>
            <label className="text-label-sm">Phone*</label>
            <input 
              type="tel" 
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%' }}
              placeholder="+44 7700 900077"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '200px' }}>
            <label className="text-label-sm">Email (Optional)</label>
            <input 
              type="email" 
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%' }}
              placeholder="sarah@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '150px' }}>
            <label className="text-label-sm">DOB (Optional)</label>
            <input 
              type="date" 
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%' }}
              value={clientDob}
              onChange={(e) => setClientDob(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2" style={{ flex: '0 1 auto', minWidth: '120px' }}>
            <label className="text-label-sm" style={{ visibility: 'hidden' }}>Submit</label>
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={isSending}>
                {isSending ? 'Sending...' : 'Add Client'}
            </button>
          </div>
        </form>
        {message && (
          <div 
             className={`mt-4 flex ${message.includes('Blocked') || message.includes('Error') ? '' : 'tag-light-green'}`}
             style={{ 
                fontSize: '0.85rem', 
                width: '100%', 
                justifyContent: 'center', 
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                backgroundColor: message.includes('Blocked') || message.includes('Error') ? '#fee2e2' : undefined,
                color: message.includes('Blocked') || message.includes('Error') ? '#dc2626' : undefined,
                fontWeight: 700,
                border: message.includes('Blocked') || message.includes('Error') ? '1px solid #fca5a5' : undefined
             }}
          >
             {message.toUpperCase()}
          </div>
        )}
      </div>

      {/* 2 Column Layout - Carousels */}
      <div className="mockup-grid mb-8">
        
        {/* LEFT COLUMN: Recent Feedback Carousel */}
        <div className="flex flex-col gap-6">
          <div className="card" style={{ flex: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-title-md">Recent Feedback Queue</h3>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/reviews'); }} className="tag-green-text" style={{ fontSize: '0.8rem' }}>View All</a>
            </div>
            
            <div className="flex flex-col gap-4 relative">
              {ratedClients.length > 0 ? (() => {
                const client = ratedClients[feedbackIndex];
                const isGoogle = client.rating_status.includes('5-Star');
                return (
                  <div key={client.id} style={{ padding: '1.25rem', backgroundColor: isGoogle ? 'var(--surface-container-low)' : '#fff9f5', borderRadius: '1rem', border: isGoogle ? 'none' : '1px solid #ffdcc8' }}>
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <h4 className="text-title-sm" style={{ fontWeight: 700 }}>{client.name}</h4>
                         <p className="text-label-sm mt-1">{new Date(client.created_at).toLocaleDateString()}</p>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className="text-title-md" style={{ color: isGoogle ? 'var(--primary)' : '#ff8c42' }}>
                           {'★'.repeat(parseInt(client.rating_status?.split('-')[0]) || 3)}{'☆'.repeat(5 - (parseInt(client.rating_status?.split('-')[0]) || 3))}
                         </span>
                         <span style={{ 
                           fontSize: '0.6rem', fontWeight: 700, 
                           backgroundColor: isGoogle ? '#E8F5E9' : '#ffdcc8', 
                           color: isGoogle ? 'var(--primary)' : '#7a3a00', 
                           padding: '0.2rem 0.4rem', borderRadius: '0.5rem', marginTop: '0.25rem', textTransform: 'uppercase' 
                         }}>
                           {isGoogle ? 'Google Redirect' : 'Internal Caught'}
                         </span>
                       </div>
                    </div>
                  </div>
                )
              })() : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  Awaiting your first review capture...
                </div>
              )}

              {/* Slider Controls */}
              {ratedClients.length > 1 && (
                <div className="flex justify-center items-center gap-4 mt-2">
                   <button type="button" className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setFeedbackIndex(prev => prev > 0 ? prev - 1 : ratedClients.length - 1)}>←</button>
                   <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{feedbackIndex + 1} of {ratedClients.length}</span>
                   <button type="button" className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setFeedbackIndex(prev => prev < ratedClients.length - 1 ? prev + 1 : 0)}>→</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Recent Public Reviews Carousel */}
        <div className="flex flex-col gap-6">
          <div className="card" style={{ flex: 1 }}>
            <h3 className="text-title-md mb-6">Recent Public Reviews</h3>
            <div className="flex flex-col gap-4 relative">
              {googleReviews.length > 0 ? (() => {
                  const r = googleReviews[publicIndex];
                  return (
                    <div key={publicIndex} style={{ padding: '1.25rem', backgroundColor: 'var(--surface-container-low)', borderRadius: '1rem' }}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                           <h4 className="text-title-sm" style={{ fontWeight: 700 }}>{r.author_name}</h4>
                           <p className="text-label-sm mt-1">{r.relative_time_description}</p>
                        </div>
                        <span className="text-title-md" style={{ color: 'var(--primary)' }}>
                           {Array.from({ length: Math.round(r.rating || 5) }).map((_, i) => '★').join('')}
                        </span>
                      </div>
                      {r.text && <p className="text-body mt-2" style={{ fontSize: '0.85rem', opacity: 0.9 }}>"{r.text}"</p>}
                    </div>
                  );
              })() : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    Awaiting public review fetch payload...
                  </div>
              )}

              {/* Slider Controls */}
              {googleReviews.length > 1 && (
                <div className="flex justify-center items-center gap-4 mt-2">
                   <button type="button" className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setPublicIndex(prev => prev > 0 ? prev - 1 : googleReviews.length - 1)}>←</button>
                   <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{publicIndex + 1} of {googleReviews.length}</span>
                   <button type="button" className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setPublicIndex(prev => prev < googleReviews.length - 1 ? prev + 1 : 0)}>→</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FULL WIDTH: Sentiment Spread Container */}
      <div className="card bg-soft mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-title-lg">Sentiment Spread (Account Lifetime)</h3>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/reviews'); }} className="tag-green-text">View Analytics</a>
        </div>

        <p className="text-body mb-4" style={{ fontSize: '0.9rem' }}>
          Out of {totalRatings} recorded reviews, <strong>{googlePercent}%</strong> were routed to Google My Business as 5-star public ratings. The remaining {internalPercent}% were caught internally for service recovery.
        </p>

        <div className="flex flex-col gap-4 max-w-lg mb-4">
          <div>
            <div className="progress-label">
              <span style={{ fontWeight: 700 }}>Google Redirects (5-Star)</span>
              <span style={{ color: 'var(--primary)' }}>{fiveStarGoogleCount}</span>
            </div>
            <div className="progress-bar-bg" style={{ height: '12px' }}>
              <div className="progress-bar-fill" style={{ width: `${googlePercent}%`, backgroundColor: 'var(--primary)' }}></div>
            </div>
          </div>

          <div>
            <div className="progress-label">
              <span style={{ fontWeight: 700, color: '#7a3a00' }}>Internal Feedback Caught</span>
              <span style={{ color: '#7a3a00' }}>{internallyCaughtCount}</span>
            </div>
            <div className="progress-bar-bg" style={{ height: '12px', backgroundColor: '#ffdcc8' }}>
              <div className="progress-bar-fill" style={{ width: `${internalPercent}%`, backgroundColor: '#ff8c42' }}></div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between items-end">
          <div className="bar-chart-container" style={{ flex: 1, height: '80px', marginRight: '2rem' }}>
            <div className="bar-wrapper"><div className="bar highlight" style={{ height: '30%' }}></div></div>
            <div className="bar-wrapper"><div className="bar highlight" style={{ height: '50%' }}></div></div>
            <div className="bar-wrapper"><div className="bar highlight" style={{ height: '80%' }}></div></div>
            <div className="bar-wrapper"><div className="bar highlight" style={{ height: '65%' }}></div></div>
            <div className="bar-wrapper"><div className="bar highlight" style={{ height: '90%' }}></div></div>
            <div className="bar-wrapper"><div className="bar highlight" style={{ height: '40%' }}></div></div>
            <div className="bar-wrapper"><div className="bar highlight" style={{ height: '70%' }}></div></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="val-sub">Review Volume</p>
            <p className="val-main" style={{ fontSize: '1.5rem' }}>{totalRatings}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;

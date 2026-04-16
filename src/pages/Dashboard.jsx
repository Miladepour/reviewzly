import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
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
              }).catch(e => console.error("Background Cache Update Failed:", e));
          }

      } else {
          setSmsBalance('No Data');
      }

    } catch (e) {
      console.error(e);
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
      
      // Physically insert the client into Postgres
      const { data: clientData, error } = await supabase.from('clients').insert([{
        business_id: session.user.id,
        name: clientName,
        phone: clientPhone,
        email: clientEmail || null,
        dob: clientDob || null,
        tags: ['Quick Add']
      }]).select().single();

      if (error) throw error;

      // === NEW: Automated SMS Dispatch ===
      const { data: bData } = await supabase.from('businesses').select('*').eq('id', session.user.id).single();
      
      let dispatchLogText = 'Client added without SMS (No template).';
      
      const template = bData?.review_sms || 'Hi {{client_name}}! Thanks for visiting {{business_name}}. Please leave us a review: {{review_link}}';
      
      if (template) {
          // Parse dynamic template variables
          let finalSms = template
              .replace(/{{business_name}}/g, bData?.name || 'Our Business')
              .replace(/{{client_name}}/g, clientName || 'there')
              .replace(/{{review_link}}/g, `${window.location.origin}/r/${clientData.short_code}`);
              
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
                 console.warn("API failed to deliver the automated payload.");
             }
          } catch(err) {
             console.error("Dispatch Error:", err);
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

      setMessage('Client accurately created in Database and Voodoo sequence initiated.');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setClientDob('');
      
      // Seamlessly refetch dashboard numbers
      await fetchDashboardData();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving client. Please try again.');
      console.error(error);
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

          <div style={{ padding: '2rem', backgroundColor: '#e8f5e9' }}>
            <p className="val-sub" style={{ color: '#2e7d32' }}>Platform SMS Balance</p>
            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              <h2 className="text-display-xl" style={{ fontSize: '2.5rem', color: '#1b5e20' }}>{smsBalance}</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#c8e6c9', color: '#1b5e20', padding: '0.25rem 0.6rem', borderRadius: '0.5rem' }}>
                 {smsBalance === 'Syncing...' ? 'Pending' : 'Live System'}
              </span>
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
          <div style={{ flex: '0 1 auto', minWidth: '120px' }}>
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={isSending}>
                {isSending ? 'Sending...' : 'Add Client'}
            </button>
          </div>
        </form>
        {message && <p className="mt-4 tag-light-green" style={{ fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}>{message}</p>}
      </div>

      {/* 2 Column Layout */}
      <div className="mockup-grid">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          
          {/* Sentiment Graph Block */}
          <div className="card bg-soft">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-title-lg">Sentiment Spread (Account Lifetime)</h3>
              <a href="#" className="tag-green-text">View Analytics</a>
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

        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          
          <div className="card">
            <h3 className="text-title-md mb-6">Recent Feedback Queue</h3>
            
            <div className="flex flex-col gap-4">
              
              {recentFeedbackList.length > 0 ? recentFeedbackList.map((client) => {
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
              }) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  Awaiting your first review capture...
                </div>
              )}
            </div>
            
            <button className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', backgroundColor: 'transparent', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }}>
              Refresh History
            </button>
          </div>

          {/* GOOGLE REVIEWS INJECTION */}
          <div className="card">
            <h3 className="text-title-md mb-6">Recent Public Reviews</h3>
            <div className="flex flex-col gap-4">
              {googleReviews.map((r, i) => (
                <div key={i} style={{ padding: '1.25rem', backgroundColor: 'var(--surface-container-low)', borderRadius: '1rem' }}>
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
              ))}
              {googleReviews.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    Awaiting public review fetch payload...
                  </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Dashboard;

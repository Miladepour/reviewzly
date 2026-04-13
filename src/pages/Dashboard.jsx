import React, { useState } from 'react';

const Dashboard = () => {
  // Simplified mock data
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientDob, setClientDob] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  const handleQuickAdd = (e) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setMessage('Client added and SMS Invite sent successfully!');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setClientDob('');
      setTimeout(() => setMessage(''), 3000);
    }, 1200);
  };

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
              <h2 className="text-display-xl" style={{ fontSize: '2.5rem' }}>1,204</h2>
              <span className="tag-green-text">+14 this week</span>
            </div>
          </div>
          
          <div style={{ padding: '2rem', borderRight: '1px solid var(--outline-variant)' }}>
            <p className="val-sub">Global Rating</p>
            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              <h2 className="text-display-xl" style={{ fontSize: '2.5rem' }}>4.8</h2>
              <div className="flex text-title-lg" style={{ color: 'var(--primary)', letterSpacing: '2px' }}>
                ★★★★★
              </div>
            </div>
          </div>

          <div style={{ padding: '2rem', backgroundColor: '#fffcf9' }}>
            <p className="val-sub" style={{ color: '#7a3a00' }}>Voodoo SMS Credits</p>
            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              <h2 className="text-display-xl" style={{ fontSize: '2.5rem', color: '#7a3a00' }}>842</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#ffdcc8', color: '#7a3a00', padding: '0.25rem 0.6rem', borderRadius: '0.5rem' }}>Refill Soon</span>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Add Client (Full Width Row) */}
      <div className="card mb-8">
        <h3 className="text-title-lg mb-2">Quick Add & Invite</h3>
        <p className="text-body mb-6" style={{ fontSize: '0.85rem' }}>Instantly log a new client and dispatch their review request.</p>
        
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
              <h3 className="text-title-lg">Sentiment Spread (7 Days)</h3>
              <a href="#" className="tag-green-text">View Analytics</a>
            </div>

            <p className="text-body mb-4" style={{ fontSize: '0.9rem' }}>
              Out of 120 reviews this week, <strong>82%</strong> were routed to Google My Business as 5-star public ratings. The remaining 18% were caught internally for service recovery.
            </p>

            <div className="flex flex-col gap-4 max-w-lg mb-4">
              <div>
                <div className="progress-label">
                  <span style={{ fontWeight: 700 }}>Google Redirects (5-Star)</span>
                  <span style={{ color: 'var(--primary)' }}>98</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '12px' }}>
                  <div className="progress-bar-fill" style={{ width: '82%', backgroundColor: 'var(--primary)' }}></div>
                </div>
              </div>

              <div>
                <div className="progress-label">
                  <span style={{ fontWeight: 700, color: '#7a3a00' }}>Internal Feedback (1-4 Star)</span>
                  <span style={{ color: '#7a3a00' }}>22</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '12px', backgroundColor: '#ffdcc8' }}>
                  <div className="progress-bar-fill" style={{ width: '18%', backgroundColor: '#ff8c42' }}></div>
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
                <p className="val-main" style={{ fontSize: '1.5rem' }}>+120</p>
              </div>
            </div>
          </div>

        </div>


        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          
          <div className="card">
            <h3 className="text-title-md mb-6">Recent Feedback</h3>
            
            <div className="flex flex-col gap-4">
              
              {/* Review 1 */}
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--surface-container-low)', borderRadius: '1rem' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-title-sm" style={{ fontWeight: 700 }}>James Wilson</h4>
                    <p className="text-label-sm mt-1">2 hours ago</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-title-md" style={{ color: 'var(--primary)' }}>★★★★★</span>
                    <span className="tag-light-green" style={{ marginTop: '0.25rem', fontSize: '0.6rem' }}>Google Redirect</span>
                  </div>
                </div>
                <p className="text-body" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                  "Absolutely amazing service! The staff was incredibly welcoming and everything was pristine."
                </p>
              </div>

              {/* Review 2 */}
              <div style={{ padding: '1.25rem', backgroundColor: '#fff9f5', borderRadius: '1rem', border: '1px solid #ffdcc8' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-title-sm" style={{ fontWeight: 700 }}>Megan Clark</h4>
                    <p className="text-label-sm mt-1">5 hours ago</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-title-md" style={{ color: '#ff8c42' }}>★★★☆☆</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, backgroundColor: '#ffdcc8', color: '#7a3a00', padding: '0.2rem 0.4rem', borderRadius: '0.5rem', marginTop: '0.25rem', textTransform: 'uppercase' }}>Internal Only</span>
                  </div>
                </div>
                <p className="text-body" style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#7a3a00' }}>
                  "The experience was okay but the waiting times were too long today. Needs better scheduling."
                </p>
              </div>

              {/* Review 3 */}
               <div style={{ padding: '1.25rem', backgroundColor: 'var(--surface-container-low)', borderRadius: '1rem' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-title-sm" style={{ fontWeight: 700 }}>Alex Thompson</h4>
                    <p className="text-label-sm mt-1">Yesterday</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-title-md" style={{ color: 'var(--primary)' }}>★★★★★</span>
                    <span className="tag-light-green" style={{ marginTop: '0.25rem', fontSize: '0.6rem' }}>Google Redirect</span>
                  </div>
                </div>
                <p className="text-body" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                  "Very highly recommended!"
                </p>
              </div>

            </div>
            
            <button className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', backgroundColor: 'transparent', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }}>
              Load History
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default Dashboard;

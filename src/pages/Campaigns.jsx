import React, { useState } from 'react';

const INITIAL_CAMPAIGNS = [
  {
    id: 'c1',
    name: 'Post-Purchase Delight Series',
    tags: ['Email + SMS'],
    startDate: 'Started Oct 12, 2023',
    gradient: 'linear-gradient(135deg, #ffaecd, #ffc7d9)',
    iconWord: <><span style={{fontSize: '0.65rem'}}>Summer</span><br/><span style={{fontSize: '1.25rem'}}>Sale</span></>,
    stats: { sent: '12,482', opened: '64.2%', rate: '18.5%' }
  },
  {
    id: 'c2',
    name: 'Loyalty Appreciation VIPs',
    tags: ['Email Only'],
    startDate: 'Started Nov 01, 2023',
    gradient: 'linear-gradient(135deg, #27798a, #165663)',
    iconWord: <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2"></circle><line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2"></line><line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2"></line></svg>,
    stats: { sent: '2,105', opened: '82.1%', rate: '31.4%' }
  }
];

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    goal: 'Generate Reviews',
    trigger: 'delay',
    delayHours: '2',
    audience: 'all_unreviewed',
    smsText: 'Hi {{client_name}}, thanks for dropping by! Please let us know how we did: {{review_link}}'
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const newCampaign = {
      id: `c_${Date.now()}`,
      name: formData.name,
      tags: ['SMS Only'],
      startDate: `Scheduled Today`,
      gradient: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
      iconWord: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>,
      stats: { sent: '0', opened: '0%', rate: '0%' }
    };
    
    setCampaigns([newCampaign, ...campaigns]);
    setIsModalOpen(false);
    // Reset form
    setFormData({
      name: '', goal: 'Generate Reviews', trigger: 'delay', delayHours: '2', audience: 'all_unreviewed',
      smsText: 'Hi {{client_name}}, thanks for dropping by! Please let us know how we did: {{review_link}}'
    });
  };

  return (
    <>
      {/* Header Block */}
      <div className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4 mb-8">
        <div style={{ maxWidth: '600px' }}>
          <h1 className="text-display-xl mb-1">Campaigns</h1>
          <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
            Nurture your customer relationships through curated automated feedback journeys.
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '0.875rem 1.5rem', flexShrink: 0 }} onClick={() => setIsModalOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          Create New Campaign
        </button>
      </div>

      {/* 2 Column Content */}
      <div className="mockup-grid">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)', flexShrink: 0 }}></span>
              <h2 className="text-title-lg">Active Momentum</h2>
            </div>
            <a href="#" className="tag-green-text">View All Records</a>
          </div>

          {campaigns.map(camp => (
            <div key={camp.id} className="campaign-card">
              <div className="campaign-icon" style={{ backgroundImage: camp.gradient }}>
                <div style={{ textAlign: 'center', color: 'white', fontWeight: 800, textTransform: 'uppercase', lineHeight: 1 }}>
                  {camp.iconWord}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-1 my-auto">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex gap-2 items-center mb-2 flex-wrap">
                      {camp.tags.map((tag, idx) => <span key={idx} className="tag-light-green">{tag}</span>)}
                      <span className="text-body" style={{ fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.2 }}>
                        {camp.startDate.split(', ').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                      </span>
                    </div>
                    <h3 className="text-title-lg" style={{ lineHeight: 1.25, fontSize: '1.3rem' }}>{camp.name}</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="circle-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button className="circle-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2.5"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-4 pt-4 border-t" style={{ borderTop: '1px solid var(--outline-variant)' }}>
                  <div>
                    <p className="val-sub">Sent</p>
                    <p className="val-main">{camp.stats.sent}</p>
                  </div>
                  <div>
                    <p className="val-sub">Opened</p>
                    <p className="val-main">{camp.stats.opened}</p>
                  </div>
                  <div>
                    <p className="val-sub">Review<br/>Rate</p>
                    <p className="val-main" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{camp.stats.rate}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>


        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          
          {/* Chart Card */}
          <div className="card bg-soft">
            <h3 className="text-title-md mb-2">Performance Velocity</h3>
            
            <div className="bar-chart-container">
              <div className="bar-wrapper">
                <div className="bar" style={{ height: '40%' }}></div>
                <div className="bar-label">MON</div>
              </div>
              <div className="bar-wrapper">
                <div className="bar" style={{ height: '60%' }}></div>
                <div className="bar-label"></div>
              </div>
              <div className="bar-wrapper">
                <div className="bar" style={{ height: '55%' }}></div>
                <div className="bar-label">WED</div>
              </div>
              <div className="bar-wrapper">
                <div className="bar" style={{ height: '80%' }}></div>
                <div className="bar-label"></div>
              </div>
              <div className="bar-wrapper">
                <div className="bar highlight" style={{ height: '70%', backgroundColor: 'var(--primary-dark)' }}></div>
                <div className="bar-label">FRI</div>
              </div>
              <div className="bar-wrapper">
                <div className="bar highlight" style={{ height: '90%' }}></div>
                <div className="bar-label"></div>
              </div>
              <div className="bar-wrapper">
                <div className="bar" style={{ height: '50%' }}></div>
                <div className="bar-label">SUN</div>
              </div>
            </div>

            <div className="card mt-4" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="val-sub" style={{ textTransform: 'none', marginBottom: '0.1rem' }}>Global Avg. Rate</p>
                <p className="val-main" style={{ fontSize: '1.75rem' }}>24.8%</p>
              </div>
              <div className="tag-green-text">+4.2%</div>
            </div>
          </div>

          {/* Channels Card */}
          <div className="card">
            <h3 className="text-title-md mb-6">Channel Resonance</h3>

            <div className="progress-container">
              <div className="progress-label">
                <span>Email Campaigns</span>
                <span>68%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: '68%' }}></div>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-label">
                <span>SMS Prompts</span>
                <span>22%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: '22%', backgroundColor: 'var(--secondary)' }}></div>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-label">
                <span>Direct Links</span>
                <span>10%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: '10%', backgroundColor: 'var(--tertiary)' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE CAMPAIGN WIZARD MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setIsModalOpen(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }} onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--outline-variant)', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <div>
                <h3 className="text-display-xl" style={{ fontSize: '1.75rem' }}>Campaign Builder</h3>
                <p className="text-body mt-1" style={{ fontSize: '0.85rem' }}>Design your automated SMS outreach flow.</p>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '2rem' }}>
              
              {/* Box 1 */}
              <div className="mb-8 p-6" style={{ backgroundColor: 'var(--surface-container-low)', borderRadius: '1rem', border: '1px solid var(--outline-variant)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                  <h4 className="text-title-lg">Core Details</h4>
                </div>
                
                <div className="flex flex-col gap-2 mb-4">
                  <label className="text-label-sm">Campaign Name*</label>
                  <input 
                    type="text" 
                    placeholder="e.g. November Win-Back Series"
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white' }}
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-label-sm">Campaign Goal</label>
                  <select 
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white' }}
                    value={formData.goal}
                    onChange={e => setFormData({...formData, goal: e.target.value})}
                  >
                    <option>Generate Reviews (Google Redirect)</option>
                    <option>Promotional Offer (Link Click)</option>
                    <option>Important Announcement</option>
                  </select>
                </div>
              </div>

              {/* Box 2 */}
              <div className="mb-8 p-6" style={{ backgroundColor: '#fffcf9', borderRadius: '1rem', border: '1px solid #ffdcc8' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#ff8c42', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                  <h4 className="text-title-lg" style={{ color: '#7a3a00' }}>Trigger Mechanics</h4>
                </div>
                
                <div className="flex gap-4 mb-4 flex-wrap">
                  <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                    <input type="radio" value="delay" checked={formData.trigger === 'delay'} onChange={e => setFormData({...formData, trigger: e.target.value})} />
                    <span className="text-body" style={{ fontWeight: 600 }}>Time-Delayed (Automation)</span>
                  </label>
                  <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                    <input type="radio" value="instant" checked={formData.trigger === 'instant'} onChange={e => setFormData({...formData, trigger: e.target.value})} />
                    <span className="text-body" style={{ fontWeight: 600 }}>Instant Broadcast (Mass Blast)</span>
                  </label>
                </div>

                {formData.trigger === 'delay' ? (
                  <div className="flex items-center gap-3 p-4" style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }}>
                    <span className="text-body">Send SMS exactly</span>
                    <input type="number" min="1" max="72" value={formData.delayHours} onChange={e => setFormData({...formData, delayHours: e.target.value})} style={{ width: '60px', padding: '0.5rem', textAlign: 'center', border: '1px solid var(--outline-variant)', borderRadius: '0.25rem' }} />
                    <span className="text-body">hours after a Client is added to the system.</span>
                  </div>
                ) : (
                  <div className="p-4" style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }}>
                    <span className="text-body" style={{ color: 'red', fontWeight: 600 }}>Warning:</span> This will instantly consume Voodoo Credits upon launch for every matched client.
                  </div>
                )}
              </div>

               {/* Box 3 */}
               <div className="mb-4 p-6" style={{ backgroundColor: 'var(--surface-container-low)', borderRadius: '1rem', border: '1px solid var(--outline-variant)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
                  <h4 className="text-title-lg">Audience & Payload</h4>
                </div>
                
                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-label-sm">Target Audience</label>
                  <select 
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white' }}
                    value={formData.audience}
                    onChange={e => setFormData({...formData, audience: e.target.value})}
                  >
                    <option value="all_unreviewed">Clients missing a review</option>
                    <option value="all">All Registered Clients</option>
                    <option value="vip">Only Returning VIPs</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label className="text-label-sm">SMS Payload</label>
                    <span className="tag-light-green" style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem' }}>Dynamic Tags Active</span>
                  </div>
                  <textarea 
                    rows="4"
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', resize: 'vertical', backgroundColor: 'white' }}
                    value={formData.smsText}
                    onChange={e => setFormData({...formData, smsText: e.target.value})}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>`{`{{client_name}}`}` `{`{{review_link}}`}`</div>
                    <span className="text-label-sm" style={{ opacity: 0.6 }}>{formData.smsText.length} / 160</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: '0.5rem 1rem' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.05rem' }}>Launch Automation</button>
              </div>

            </form>

          </div>
        </div>
      )}

    </>
  );
};

export default Campaigns;

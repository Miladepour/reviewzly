import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('workspace');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Workspace State
  const [businessName, setBusinessName] = useState('');
  const [gmbUrl, setGmbUrl] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // Templates State
  const [reviewSms, setReviewSms] = useState('');
  const [birthdaySms, setBirthdaySms] = useState('');

  useEffect(() => {
    const fetchBusiness = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) return;
       const { data } = await supabase.from('businesses').select('*').eq('id', session.user.id).single();
       if (data) {
         setBusinessName(data.name || '');
         setGmbUrl(data.gmb_url || '');
         setRecoveryEmail(data.recovery_email || '');
         setReviewSms(data.review_sms || '');
         setBirthdaySms(data.birthday_sms || '');
         setBrandColor(data.brand_color || '#00a84d');
       }
    }
    fetchBusiness();
  }, []);

  // Branding State
  const [brandColor, setBrandColor] = useState('#00a84d');

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('businesses').update({
         name: businessName,
         gmb_url: gmbUrl,
         recovery_email: recoveryEmail,
         review_sms: reviewSms,
         birthday_sms: birthdaySms,
         brand_color: brandColor
      }).eq('id', session.user.id);
      
      if (error) throw error;
      
      setSaveMessage('Platform settings saved securely to Database.');
    } catch (err) {
      console.error(err);
      setSaveMessage('Error saving configurations. Ensure SQL columns are added!');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-8 flex-1">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-display-xl mb-1">Platform Settings</h1>
          <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
            Configure your brand, routing channels, and automated SMS templates.
          </p>
        </div>
        {saveMessage && <div className="tag-light-green">{saveMessage}</div>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
          <button 
            onClick={() => setActiveTab('workspace')}
            style={{ 
              flex: 1, padding: '1.25rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
              backgroundColor: activeTab === 'workspace' ? 'white' : 'transparent',
              color: activeTab === 'workspace' ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
              borderBottom: activeTab === 'workspace' ? '3px solid var(--primary)' : '3px solid transparent'
            }}
          >
            Core Workspace
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            style={{ 
              flex: 1, padding: '1.25rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
              backgroundColor: activeTab === 'templates' ? 'white' : 'transparent',
              color: activeTab === 'templates' ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
              borderBottom: activeTab === 'templates' ? '3px solid var(--primary)' : '3px solid transparent'
            }}
          >
            SMS Templates
          </button>
          <button 
            onClick={() => setActiveTab('branding')}
            style={{ 
              flex: 1, padding: '1.25rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
              backgroundColor: activeTab === 'branding' ? 'white' : 'transparent',
              color: activeTab === 'branding' ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
              borderBottom: activeTab === 'branding' ? '3px solid var(--primary)' : '3px solid transparent'
            }}
          >
            Public Branding
          </button>
          <button 
            onClick={() => setActiveTab('link')}
            style={{ 
              flex: 1, padding: '1.25rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
              backgroundColor: activeTab === 'link' ? 'white' : 'transparent',
              color: activeTab === 'link' ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
              borderBottom: activeTab === 'link' ? '3px solid var(--primary)' : '3px solid transparent'
            }}
          >
            My Public Link
          </button>
        </div>

        {/* Content Area */}
        <form onSubmit={handleSave} style={{ padding: '2.5rem' }}>
          
          {/* TAB 1: WORKSPACE */}
          {activeTab === 'workspace' && (
            <div className="flex flex-col gap-6 max-w-lg mx-auto" style={{ maxWidth: '700px' }}>
              <div>
                <h2 className="text-title-lg mb-2">Workspace Configuration</h2>
                <p className="text-body mb-6">Manage where your core routing directs data.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label-sm" style={{ fontWeight: 700 }}>Google My Business Review URL*</label>
                <p className="text-body mb-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>This is where 5-star clients are automatically redirected. <a href="#" style={{ color: 'var(--primary)' }}>Find my GMB link</a>.</p>
                <input 
                  type="url" 
                  style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--primary)', outline: 'none', width: '100%', backgroundColor: 'var(--surface-container-low)' }}
                  value={gmbUrl}
                  onChange={(e) => setGmbUrl(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-label-sm" style={{ fontWeight: 700 }}>Business Name*</label>
                <p className="text-body mb-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>This maps to the <code>{`{{business_name}}`}</code> variable across your templates.</p>
                <input 
                  type="text" 
                  style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%' }}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-label-sm" style={{ fontWeight: 700, color: '#7a3a00' }}>Internal Recovery Alert Email</label>
                <p className="text-body mb-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Who should be instantly emailed when a client submits a 1-4 star internal complaint?</p>
                <input 
                  type="email" 
                  style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #ffdcc8', outline: 'none', width: '100%', backgroundColor: '#fffcf9' }}
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 2: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="flex flex-col gap-6 max-w-lg mx-auto" style={{ maxWidth: '700px' }}>
              <div>
                <h2 className="text-title-lg mb-2">Automated SMS Configuration</h2>
                <p className="text-body mb-6">Design the text messaging payloads sent via Voodoo. Use exact bracket syntax for dynamic tokens.</p>
              </div>

              <div className="flex gap-2 flex-wrap mb-4">
                <span className="tag-light-green" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>{`{{client_name}}`}</span>
                <span className="tag-light-green" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>{`{{business_name}}`}</span>
                <span className="tag-light-green" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>{`{{review_link}}`}</span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label-sm" style={{ fontWeight: 700 }}>Review Request SMS Outline</label>
                <p className="text-body mb-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Sent instantly via the Quick Setup form or Directory.</p>
                <textarea 
                  rows="4"
                  style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', resize: 'vertical' }}
                  value={reviewSms}
                  onChange={(e) => setReviewSms(e.target.value)}
                  required
                />
                <span className="text-label-sm" style={{ alignSelf: 'flex-end', opacity: 0.6 }}>{reviewSms.length} / 160 chars (1 SMS segment)</span>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <label className="text-label-sm" style={{ fontWeight: 700 }}>Birthday Campaign Offer</label>
                <p className="text-body mb-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Automatically fired on the client's registered Date of Birth.</p>
                <textarea 
                  rows="4"
                  style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', resize: 'vertical' }}
                  value={birthdaySms}
                  onChange={(e) => setBirthdaySms(e.target.value)}
                  required
                />
                 <span className="text-label-sm" style={{ alignSelf: 'flex-end', opacity: 0.6 }}>{birthdaySms.length} / 160 chars (1 SMS segment)</span>
              </div>
            </div>
          )}

          {/* TAB 3: BRANDING */}
          {activeTab === 'branding' && (
            <div className="flex flex-col gap-6 max-w-lg mx-auto" style={{ maxWidth: '700px' }}>
              <div>
                <h2 className="text-title-lg mb-2">Public Landing Appearance</h2>
                <p className="text-body mb-6">Customize what the client sees when they land on your internal `{`{{review_link}}`}`.</p>
              </div>

              <div className="flex flex-col gap-2">
                 <label className="text-label-sm" style={{ fontWeight: 700 }}>Brand Logo</label>
                 <div className="flex items-center gap-6 mt-2" style={{ padding: '1.5rem', border: '1px dashed var(--outline-variant)', borderRadius: '1rem', backgroundColor: 'var(--surface-container-lowest)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/logo.png" alt="Current Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <button type="button" className="btn-primary" style={{ backgroundColor: 'white', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }}>Upload New Image</button>
                      <p className="text-label-sm mt-2" style={{ opacity: 0.6 }}>PNG or JPG. Minimum 200x200px.</p>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <label className="text-label-sm" style={{ fontWeight: 700 }}>Primary Brand Color</label>
                <p className="text-body mb-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Used across the buttons and star rating highlights.</p>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    style={{ width: '48px', height: '48px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                  />
                  <input 
                    type="text" 
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '120px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PUBLIC LINK */}
          {activeTab === 'link' && (
            <div className="flex flex-col gap-6 max-w-lg mx-auto" style={{ maxWidth: '700px' }}>
              <div>
                <h2 className="text-title-lg mb-2">Your Review Capture URL</h2>
                <p className="text-body mb-6">This is your unique landing page. Whenever you send an SMS invite, the `{`{{review_link}}`}` token generates this URL.</p>
              </div>

              <div className="flex flex-col gap-2">
                 <label className="text-label-sm" style={{ fontWeight: 700 }}>Active Public Link</label>
                 <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="text" 
                      readOnly
                      value="http://localhost:5173/r/reviewzly-pro"
                      style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--primary)', width: '100%', backgroundColor: 'var(--surface-container-lowest)', fontWeight: 600, color: 'var(--primary-dark)' }}
                    />
                    <a href="/r/reviewzly-pro" target="_blank" className="btn-primary" style={{ padding: '1rem 1.5rem', textDecoration: 'none', flexShrink: 0 }}>
                      Preview Live Flow
                    </a>
                 </div>
                 <p className="text-label-sm mt-2" style={{ opacity: 0.6 }}>Test the exact mobile experience your clients will see when rating your business.</p>
              </div>
            </div>
          )}

          {/* Universal Footer Action */}
          <div className="flex justify-end pt-8 mt-4 border-t" style={{ borderTop: '1px solid var(--outline-variant)', maxWidth: '700px', mx: 'auto' }}>
            <button type="submit" className="btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.05rem' }} disabled={isSaving}>
              {isSaving ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default Settings;

import React, { useState } from 'react';

const Integrations = () => {
  const [activeTab, setActiveTab] = useState('guide');
  const [apiKey, setApiKey] = useState('vdoo_live_9481jksd9823k');
  const [senderId, setSenderId] = useState('Reviewzly');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-8 flex-1">
      <div>
        <h1 className="text-display-xl mb-1">SMS Integration Integrations</h1>
        <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
          Connect your Reviewzly platform to Voodoo SMS to enable automated review requests.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
          <button 
            onClick={() => setActiveTab('guide')}
            style={{ 
              flex: 1, padding: '1.25rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
              backgroundColor: activeTab === 'guide' ? 'white' : 'transparent',
              color: activeTab === 'guide' ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
              borderBottom: activeTab === 'guide' ? '3px solid var(--primary)' : '3px solid transparent'
            }}
          >
            Voodoo Setup Guide
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            style={{ 
              flex: 1, padding: '1.25rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
              backgroundColor: activeTab === 'settings' ? 'white' : 'transparent',
              color: activeTab === 'settings' ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
              borderBottom: activeTab === 'settings' ? '3px solid var(--primary)' : '3px solid transparent'
            }}
          >
            API Settings
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '2rem 2.5rem' }}>
          
          {activeTab === 'guide' && (
            <div className="flex flex-col gap-8 max-w-lg mx-auto" style={{ maxWidth: '800px' }}>
              <div>
                <h2 className="text-title-lg mb-4">How to create your Voodoo SMS account</h2>
                <p className="text-body mb-6">Follow these simple steps to generate the API credentials required to send SMS automatically through Reviewzly.</p>
              </div>

              <div className="flex flex-col gap-6">
                
                {/* Step 1 */}
                <div className="flex gap-4 items-start">
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>1</div>
                  <div>
                    <h3 className="text-title-md mb-1">Create an Account</h3>
                    <p className="text-body" style={{ fontSize: '0.95rem' }}>Navigate to <a href="https://www.voodoosms.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>voodoosms.com</a> and click "Register" or "Sign Up". Fill in your business details to complete the registration process.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 items-start">
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>2</div>
                  <div>
                    <h3 className="text-title-md mb-1">Top Up Your Credits</h3>
                    <p className="text-body" style={{ fontSize: '0.95rem' }}>Once inside the Voodoo dashboard, navigate to the Billing section to purchase SMS credits. You must have a positive balance for Reviewzly to dispatch messages.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 items-start">
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>3</div>
                  <div>
                    <h3 className="text-title-md mb-1">Generate API Key</h3>
                    <p className="text-body" style={{ fontSize: '0.95rem' }}>In the Voodoo sidebar, go to <strong>Developers &gt; API Keys</strong>. Click "Create New Key". Keep this key secure and do not share it publicly.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4 items-start">
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>4</div>
                  <div>
                    <h3 className="text-title-md mb-1">Connect to Reviewzly</h3>
                    <p className="text-body" style={{ fontSize: '0.95rem' }}>Copy the generated API Key and navigate to the <strong>API Settings</strong> tab on this page. Paste the key and set your preferred Sender ID (e.g., your business name up to 11 characters).</p>
                  </div>
                </div>

              </div>
              
              <div className="mt-4">
                <button className="btn-primary" onClick={() => setActiveTab('settings')}>Go to API Settings</button>
              </div>

            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ maxWidth: '600px' }}>
              <div className="mb-6">
                <h2 className="text-title-lg mb-2">Voodoo API Configuration</h2>
                <p className="text-body">Paste your credentials below to authenticate the gateway. This grants Reviewzly permission to send SMS on your behalf.</p>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-5">
                
                <div className="flex flex-col gap-2">
                  <label className="text-label-sm" style={{ fontWeight: 700 }}>Voodoo API Key*</label>
                  <p className="text-body mb-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Found in your Voodoo Dashboard under Developers &gt; API Keys.</p>
                  <input 
                    type="password" 
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', fontFamily: 'monospace' }}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-label-sm" style={{ fontWeight: 700 }}>Sender ID*</label>
                  <p className="text-body mb-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>The name your customers will see as the SMS sender (Max 11 alphanumeric characters).</p>
                  <input 
                    type="text" 
                    maxLength="11"
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', fontWeight: 600 }}
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    required
                  />
                </div>

                <div className="p-4 mt-2" style={{ backgroundColor: '#e2f0fe', borderRadius: '0.5rem', border: '1px solid #c2e0ff' }}>
                  <div className="flex items-start gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b64b1" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <p className="text-body" style={{ fontSize: '0.85rem', color: '#1b64b1' }}>
                      Current API Status: <strong>Connected</strong>. Your last successful ping was 2 minutes ago.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <button type="submit" className="btn-primary" style={{ padding: '1rem 2rem' }}>
                    Save Configuration
                  </button>
                  {isSaved && <span className="tag-light-green">Settings saved successfully!</span>}
                </div>

              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Integrations;

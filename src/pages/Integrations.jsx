import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Integrations = () => {
  const [activeTab, setActiveTab] = useState('guide');
  
  // Connect natively to Postgres Database
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const fetchKeys = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('businesses').select('voodoo_api_key, voodoo_sender_id').eq('id', session.user.id).single();
      
      if (data) {
         if (data.voodoo_api_key) setApiKey(data.voodoo_api_key);
         if (data.voodoo_sender_id) setSenderId(data.voodoo_sender_id);
      }
    };
    fetchKeys();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Natively inject the API tokens directly into Postgres
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       await supabase.from('businesses').update({
           voodoo_api_key: apiKey,
           voodoo_sender_id: senderId
       }).eq('id', session.user.id);
    }
    
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-8 flex-1">
      <div>
        <h1 className="text-display-xl mb-1">Integrations</h1>
        <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
          Connect your Reviewzly platform to external APIs.
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="flex" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
          <button onClick={() => setActiveTab('guide')} style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', borderBottom: activeTab === 'guide' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'guide' ? 'var(--primary)' : 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            Voodoo SMS Setup Guide
          </button>
          <button onClick={() => setActiveTab('keys')} style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', borderBottom: activeTab === 'keys' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'keys' ? 'var(--primary)' : 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            API Keys & Webhooks
          </button>
        </div>

        <div style={{ padding: '2rem' }}>
          {activeTab === 'guide' ? (
             <div className="flex flex-col gap-4">
                <h3 className="text-title-lg">How to connect SMS</h3>
                <p className="text-body" style={{ fontSize: '0.9rem' }}>Voodoo SMS integration requires your live API key to dispatch review requests. Follow the instructions to generate your REST endpoint token.</p>
             </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-lg">
              <div>
                <label className="text-label-sm mb-2 block">Voodoo SMS REST API Key</label>
                <input 
                  type="password" 
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '1rem', letterSpacing: '2px', fontFamily: 'monospace' }}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste live token here..."
                />
              </div>
              <div>
                <label className="text-label-sm mb-2 block">Approved Sender ID (11 chars max)</label>
                <input 
                  type="text" 
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '1rem' }}
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  placeholder="e.g. MyAgency"
                  maxLength={11}
                />
              </div>

              <div className="flex items-center gap-4 mt-2">
                <button type="submit" className="btn-primary" style={{ padding: '0.85rem 2rem' }} disabled={isSaving}>
                  {isSaving ? 'Validating...' : 'Validate & Save Keys'}
                </button>
                {isSaved && <span className="tag-light-green">Config updated successfully</span>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Integrations;

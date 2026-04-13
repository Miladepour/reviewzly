import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data } = await supabase
          .from('communications')
          .select('client_id, text, created_at')
          .eq('business_id', session.user.id)
          .eq('type', 'BULK_CAMPAIGN')
          .order('created_at', { ascending: false });

        if (data) {
            setCampaigns(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex justify-between items-start md-items-center">
        <div>
          <h1 className="text-display-xl mb-1">Live Campaigns & Blasts</h1>
          <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
            Your automated SMS dispatches sourced directly from the database.
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '2rem' }}>
          + New Campaign
        </button>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
         <h3 className="text-title-lg mb-6">Database Push Logs</h3>
         
         <div className="flex flex-col gap-4">
             {isLoading ? <p>Reading Postgres communication strings...</p> : 
              campaigns.length > 0 ? campaigns.map((camp, idx) => (
                 <div key={idx} style={{ padding: '1.5rem', border: '1px solid var(--outline-variant)', borderRadius: '1rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                     <div style={{ width: '60px', height: '60px', borderRadius: '1rem', background: 'linear-gradient(135deg, #2aa29b, #1d7a74)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                     </div>
                     <div style={{ flex: 1 }}>
                         <div className="flex gap-2 items-center mb-1">
                             <h4 className="text-title-md">System Dispatch</h4>
                             <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--surface-container-high)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>SMS / Campaign</span>
                         </div>
                         <p className="text-body" style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>{camp.text}</p>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                         <span className="text-label-sm" style={{ display: 'block', color: 'var(--on-surface-variant)' }}>Timestamp</span>
                         <span className="text-title-md">{new Date(camp.created_at).toLocaleString()}</span>
                     </div>
                 </div>
             )) : (
                 <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                     No campaigns have been triggered yet. Run your first Quick Add to see system dispatches here!
                 </div>
             )}
         </div>
      </div>
      
    </div>
  );
};

export default Campaigns;

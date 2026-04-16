import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const Campaigns = () => {
  const addToast = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [businessData, setBusinessData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetGroup, setTargetGroup] = useState('PENDING'); // 'ALL' | 'PENDING' | 'BIRTHDAY'
  const [campaignName, setCampaignName] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState('');
  
  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // 1. Fetch Aggregated Master Campaigns
      const { data: camps, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('business_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error && error.code === '42P01') {
          // Table doesn't exist yet! Handle gracefully for UX.
          addToast("SQL REQUIRED: Missing campaigns table", "error");
          setCampaigns([]);
      } else if (camps) {
          setCampaigns(camps);
      }

      // 2. Fetch All Clients for filtering
      const { data: cls } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', session.user.id);
        
      if (cls) setClients(cls);

      // 3. Fetch Business Profile & Credits
      const { data: bData } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (bData) {
          setBusinessData(bData);
          if (!customMessage) setCustomMessage(bData.review_sms || "Hi {{client_name}}! Thanks for visiting {{business_name}}. Please leave us a review: {{review_link}}");
      }

    } catch (e) {
      addToast("Failed to fetch campaign data natively.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const showNotice = (text, type = 'success') => {
      addToast(text, type);
  };

  // Determine Matched List
  const getMatchedClients = () => {
      if (targetGroup === 'ALL') {
          return clients;
      }
      if (targetGroup === 'PENDING') {
          return clients.filter(c => !c.rating_status || c.rating_status === 'Pending');
      }
      if (targetGroup === 'BIRTHDAY') {
          const today = new Date();
          const todaySuffix = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
          return clients.filter(c => {
              if (!c.dob) return false;
              return c.dob.slice(-5) === todaySuffix;
          });
      }
      return [];
  };

  const matchedClients = getMatchedClients();
  const predictedCost = matchedClients.length;
  const currentCredits = businessData?.sms_credits || 0;
  const isAffordable = currentCredits >= predictedCost;

  const handleDispatchCampaign = async () => {
      if (predictedCost === 0) return;
      if (!isAffordable) return;
      if (!campaignName) {
          addToast('Please enter a Campaign Name before blasting.', 'warning');
          return;
      }
      
      setIsDispatching(true);
      setDispatchStatus(`Initializing blast to ${predictedCost} clients...`);

      try {
          const { data: { session } } = await supabase.auth.getSession();
          let successCount = 0;
          let failCount = 0;

          // Sequential loop for network stability and accurate billing feedback
          for (let i = 0; i < matchedClients.length; i++) {
              const client = matchedClients[i];
              setDispatchStatus(`Sending ${i + 1} of ${predictedCost}... (${client.name})`);

              // Apply variables to user's custom typed message
              let finalSms = customMessage
                  .replace(/{{business_name}}/g, businessData.name || 'Our Team')
                  .replace(/{{client_name}}/g, client.name || 'there')
                  .replace(/{{review_link}}/g, `${window.location.origin}/r/${client.short_code}`);

              let dispatchLogText = '';
              const destPhone = client.phone.replace(/[^0-9]/g, '');

              try {
                  const vRes = await fetch('/api/send_sms', {
                      method: 'POST',
                      headers: { 
                          'Authorization': `Bearer ${session.access_token}`,
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ dest: destPhone, msg: finalSms, clientName: client.name })
                  });
                  
                  if (vRes.ok) {
                      dispatchLogText = `[Delivered] ${finalSms}`;
                      successCount++;
                  } else {
                      dispatchLogText = `[Blocked via Carrier] Data: ${vRes.status}`;
                      failCount++;
                  }
              } catch(err) {
                  dispatchLogText = `[Edge Proxy Failed]`;
                  failCount++;
              }

              // Drop tracking footprint in client's local CRM thread
              await supabase.from('communications').insert([{
                 client_id: client.id,
                 business_id: session.user.id,
                 type: 'BULK_CAMPAIGN',
                 text: `[${campaignName}] ${dispatchLogText}`,
                 is_outbound: true
              }]);
          }

          // Generate the Universal Master Campaign Report Row
          const { error: campaignInsertError } = await supabase.from('campaigns').insert([{
             business_id: session.user.id,
             name: campaignName,
             message_template: customMessage,
             target_audience: targetGroup,
             total_targets: predictedCost,
             success_count: successCount,
             fail_count: failCount
          }]);
          
          if(campaignInsertError) {
              addToast("Could not write master report. Table missing?", "error");
          }

          setIsModalOpen(false);
          setCampaignName('');
          showNotice(`Campaign Delivery Completed: ${successCount} Successful, ${failCount} Failed.`);
          await fetchDashboardData(); // Refresh UI State

      } catch (e) {
          addToast("A critical error interrupted the global campaign loop.", "error");
      } finally {
          setIsDispatching(false);
          setDispatchStatus('');
      }
  };

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex justify-between items-start md-items-center">
        <div>
          <h1 className="text-display-xl mb-1">Marketing Campaigns</h1>
          <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
            Drive massive retention by broadcasting custom reports directly via Voodoo Edge.
          </p>
        </div>
        {!isLoading && (
            <button 
                className="btn-primary" 
                onClick={() => setIsModalOpen(true)}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem' }}
            >
            + New Campaign
            </button>
        )}
      </div>



      {/* Relational Master View */}
      <div className="card" style={{ padding: '2rem' }}>
         <h3 className="text-title-lg mb-6">Historical Engagements</h3>
         
         <div className="flex flex-col gap-4">
             {isLoading ? <p>Reading Postgres communication matrix...</p> : 
              campaigns.length > 0 ? campaigns.map((camp, idx) => {
                  const successRate = camp.total_targets > 0 ? Math.round((camp.success_count / camp.total_targets) * 100) : 0;
                  return (
                 <div key={idx} style={{ padding: '1.5rem', border: '1px solid var(--outline-variant)', borderRadius: '1rem', display: 'flex', gap: '2rem', alignItems: 'center', backgroundColor: 'var(--surface-container-lowest)' }}>
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                         <div className="flex gap-2 items-center">
                             <h4 className="text-title-md" style={{ fontSize: '1.25rem' }}>{camp.name}</h4>
                             <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--surface-container-high)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>{camp.target_audience}</span>
                         </div>
                         <p className="text-body" style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', maxWidth: '600px' }}>"{camp.message_template}"</p>
                     </div>
                     <div style={{ textAlign: 'right', minWidth: '150px' }}>
                         <span className="text-label-sm" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Delivery Rate</span>
                         <div className="flex items-center justify-end gap-2">
                             <span className="text-title-lg" style={{ color: successRate > 90 ? 'var(--primary)' : '#e84545' }}>{successRate}%</span>
                             <span className="text-body" style={{ fontSize: '0.85rem' }}>({camp.success_count}/{camp.total_targets})</span>
                         </div>
                         <span className="text-label-sm" style={{ display: 'block', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>{new Date(camp.created_at).toLocaleDateString()}</span>
                     </div>
                 </div>
              )}) : (
                 <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                     No broadcast campaigns have been tracked. Click the button above to begin leveraging Voodoo networking!
                 </div>
             )}
         </div>
      </div>

      {/* NEW CAMPAIGN WIZARD MODAL */}
      {isModalOpen && (
        <div onClick={() => !isDispatching && setIsModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
             
             <div className="flex justify-between items-center mb-2">
                 <h2 className="text-title-lg">Configure Bulk Dispatch</h2>
                 <span style={{ backgroundColor: 'var(--surface-container-low)', padding: '0.35rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface)' }}>v2 Wizard</span>
             </div>
             
             {isDispatching ? (
                 <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <p className="text-title-md mb-2" style={{ color: 'var(--primary-dark)' }}>Broadcasting Active...</p>
                    <div className="progress-bar-bg mb-4">
                       <div className="progress-bar-fill" style={{ width: '100%', animation: 'pulse 1.5s infinite' }}></div>
                    </div>
                    <p className="text-body">{dispatchStatus}</p>
                 </div>
             ) : (
                 <>
                     {/* Step 1: Branding & Identification */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                         <label className="text-label-sm">Campaign Name</label>
                         <input 
                            type="text" 
                            placeholder="e.g. Winter Promo, Review Push, Birthday Blaster..." 
                            value={campaignName} 
                            onChange={(e) => setCampaignName(e.target.value)} 
                            style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', width: '100%', fontSize: '1rem', backgroundColor: 'var(--surface-container-lowest)' }} 
                         />
                     </div>

                     {/* Step 2: Message Design Console */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                         <label className="text-label-sm">Custom SMS Draft</label>
                         <textarea 
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            rows="4"
                            style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', width: '100%', fontSize: '0.95rem', fontFamily: 'var(--font-body)', resize: 'vertical', lineHeight: 1.5 }}
                         ></textarea>
                         <div className="flex justify-between" style={{ padding: '0 0.25rem' }}>
                             <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Available variables: <code style={{ backgroundColor: 'var(--surface-container-low)', padding: '2px 4px', borderRadius: '4px' }}>{`{{client_name}}`}</code>, <code style={{ backgroundColor: 'var(--surface-container-low)', padding: '2px 4px', borderRadius: '4px' }}>{`{{business_name}}`}</code></span>
                             <span style={{ fontSize: '0.75rem', color: customMessage.length > 160 ? '#e84545' : 'var(--on-surface-variant)', fontWeight: 600 }}>{customMessage.length} / 160 chars</span>
                         </div>
                     </div>

                     {/* Step 3: Target Engine */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                         <label className="text-label-sm">Target Audience Segment</label>
                         <select 
                            value={targetGroup} 
                            onChange={(e) => setTargetGroup(e.target.value)}
                            style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', backgroundColor: 'white', appearance: 'auto', fontSize: '1rem' }}
                         >
                            <option value="ALL">Global Roster (All CRM Contacts)</option>
                            <option value="PENDING">Pending Feedback (No Rating Detected)</option>
                            <option value="BIRTHDAY">Birthdays Today</option>
                         </select>
                     </div>

                     {/* Step 4: System Metrics Panel */}
                     <div style={{ backgroundColor: 'var(--surface-container-low)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--outline-variant)' }}>
                         <div className="flex justify-between items-center mb-3">
                             <span className="text-body" style={{ fontWeight: 600 }}>Target Size:</span>
                             <span className="text-title-lg" style={{ color: predictedCost > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
                                 {predictedCost} Client{predictedCost !== 1 && 's'}
                             </span>
                         </div>
                         <div className="flex justify-between items-center mb-3">
                             <span className="text-body" style={{ fontWeight: 600 }}>Expected Cost:</span>
                             <span className="text-title-lg text-primary">{predictedCost} Credits</span>
                         </div>
                         <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px dashed var(--outline-variant)' }}>
                             <span className="text-body" style={{ fontWeight: 600 }}>Available Ledger Balance:</span>
                             <span className="text-title-lg" style={{ color: isAffordable ? '#2e7d32' : '#c62828' }}>{currentCredits} Credits</span>
                         </div>
                     </div>

                     {/* Authorization Block Logic */}
                     {!isAffordable && (
                         <div style={{ padding: '1rem', backgroundColor: '#FFEBEE', color: '#c62828', borderRadius: '0.5rem', fontSize: '0.9rem', border: '1px solid #ffcdd2' }}>
                             <strong>Insufficient Liquidity:</strong> Your campaign exceeds your current operational balance. Please top-up via your <Link to="/dashboard/sms" onClick={() => setIsModalOpen(false)} style={{ color: '#c62828', textDecoration: 'underline' }}>SMS Hub</Link> to proceed.
                         </div>
                     )}
                     {predictedCost === 0 && (
                         <div style={{ padding: '1rem', backgroundColor: '#FFF3CD', color: '#856404', borderRadius: '0.5rem', fontSize: '0.9rem', border: '1px solid #ffeeba' }}>
                            There are currently 0 clients fitting this demographic target block.
                         </div>
                     )}

                     <div className="flex gap-4 justify-end mt-2">
                        <button onClick={() => setIsModalOpen(false)} className="text-body" style={{ background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: '0.5rem 1rem' }}>Cancel</button>
                        <button 
                            className="btn-primary" 
                            onClick={handleDispatchCampaign}
                            disabled={!isAffordable || predictedCost === 0 || !campaignName}
                            style={{ 
                                opacity: (!isAffordable || predictedCost === 0 || !campaignName) ? 0.5 : 1, 
                                cursor: (!isAffordable || predictedCost === 0 || !campaignName) ? 'not-allowed' : 'pointer' 
                             }}
                        >
                            Authorize Campaign Dispatch
                        </button>
                     </div>
                 </>
             )}
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Campaigns;

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Profile Popup State
  const [activeClient, setActiveClient] = useState(null);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    try {
        const text = await file.text();
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        
        // Remove header row if exists
        if(rows[0].toLowerCase().includes('name') || rows[0].toLowerCase().includes('phone')) {
            rows.shift();
        }

        const { data: { session } } = await supabase.auth.getSession();
        const bid = session.user.id;
        const { data: bData } = await supabase.from('businesses').select('*').eq('id', bid).single();

        let importedCount = 0;

        for (const row of rows) {
            const cols = row.split(',').map(c => c.trim());
            const cName = cols[0];
            const cPhone = cols[1];
            
            if (!cName || !cPhone) continue;

            const { data: clientData, error } = await supabase.from('clients').insert([{
              business_id: bid,
              name: cName,
              phone: cPhone,
              tags: ['CSV Import']
            }]).select().single();

            if (!error && clientData) {
                importedCount++;
                
                // Fire Automated SMS Template if exists
                let dispatchLogText = 'Added via CSV without SMS (No template).';
                
                if (bData && bData.voodoo_api_key && bData.review_sms) {
                    let finalSms = bData.review_sms
                        .replace(/{{business_name}}/g, bData.name || 'Our Business')
                        .replace(/{{client_name}}/g, cName || 'there')
                        .replace(/{{review_link}}/g, `http://localhost:5173/r/${bData.name?.toLowerCase().replace(/ /g, '-') || 'reviewzly-pro'}`);
                    
                    try {
                       const destPhone = cPhone.replace(/[^0-9]/g, '');
                       const vRes = await fetch('/api/voodoo/sendsms', {
                          method: 'POST',
                          headers: { 
                              'Authorization': `Bearer ${bData.voodoo_api_key}`,
                              'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                              to: destPhone,
                              from: bData.voodoo_sender_id || 'Reviewzly',
                              msg: finalSms
                          })
                       });
                       
                       if (vRes.ok) {
                           dispatchLogText = `[AUTO-DISPATCH SUCCESS] ` + finalSms;
                       } else {
                           dispatchLogText = `[AUTO-DISPATCH BLOCKED] ` + finalSms;
                       }
                    } catch(err) {
                       dispatchLogText = `[AUTO-DISPATCH ERROR] Network proxy securely failed.`;
                    }
                }
                
                await supabase.from('communications').insert([{
                   client_id: clientData.id,
                   business_id: session.user.id,
                   type: 'BULK_CAMPAIGN',
                   text: dispatchLogText,
                   is_outbound: true
                }]);
            }
        }
        
        alert(`Successfully imported ${importedCount} clients and routed automated sequences!`);
        setIsImportModalOpen(false);
        const { data } = await supabase.from('clients').select('*').eq('business_id', bid).order('created_at', { ascending: false });
        if(data) setClients(data);

    } catch (e) {
        alert("Error parsing CSV format.");
        console.error(e);
    } finally {
        setIsImporting(false);
    }
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('business_id', session.user.id)
          .order('created_at', { ascending: false });

        if (data) setClients(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleDeleteClient = async (e, clientId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to completely erase this contact and their history?")) {
        const { error } = await supabase.from('clients').delete().eq('id', clientId);
        if (!error) {
            setClients(prev => prev.filter(c => c.id !== clientId));
        } else {
            alert("Error deleting client.");
            console.error(error);
        }
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.phone.includes(searchQuery);
    
    // Status Filter parsing
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Review Received') return matchesSearch && client.rating_status && client.rating_status !== 'Pending';
    if (statusFilter === 'Pending') return matchesSearch && (!client.rating_status || client.rating_status === 'Pending');
    
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6" style={{ height: '100%', minHeight: '80vh' }}>
      
      <div className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4">
        <div>
          <h1 className="text-display-xl mb-1">Clients Directory</h1>
          <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
            Live CRM connection established.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsImportModalOpen(true)} style={{ padding: '0.75rem 1.5rem' }}>
          + Import CSV
        </button>
      </div>

      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div className="flex flex-col md-flex-row justify-between gap-4" style={{ padding: '1.5rem', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '0.95rem' }}
            />
          </div>

          <div className="flex gap-2">
            {['All', 'Pending', 'Review Received'].map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: statusFilter === status ? 'var(--primary)' : 'transparent',
                  color: statusFilter === status ? 'white' : 'var(--on-surface-variant)',
                  border: statusFilter === status ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
                  transition: 'all 0.2s'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto styled-scrollbar" style={{ minHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)' }}>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>CLIENT NAME</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>PHONE NUMBER</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>ACQUISITION DATE</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>FEEDBACK STATUS</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>TAGS</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Syncing with Postgres...</td></tr>
              ) : filteredClients.length > 0 ? filteredClients.map((c) => (
                <tr key={c.id} onClick={() => setActiveClient(c)} style={{ borderBottom: '1px solid var(--outline-variant)', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-container-lowest)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface)' }}>{c.name}</td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--on-surface-variant)' }}>{c.phone}</td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--on-surface-variant)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.35rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700,
                      backgroundColor: c.rating_status?.includes('5-Star') ? '#E8F5E9' : c.rating_status?.includes('Star') ? '#FFF3CD' : 'var(--surface-container-high)',
                      color: c.rating_status?.includes('5-Star') ? 'var(--primary)' : c.rating_status?.includes('Star') ? '#856404' : 'var(--on-surface-variant)'
                    }}>
                      {c.rating_status || 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                     {c.tags && c.tags.length > 0 ? c.tags.join(', ') : '-'}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                    <button 
                      onClick={(e) => handleDeleteClient(e, c.id)}
                      style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#e84545', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No clients found in the database. Use Quick Add or Inbox to add your first!</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div onClick={() => setIsImportModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <h2 className="text-title-lg">Import Contacts via CSV</h2>
             <div style={{ backgroundColor: 'var(--surface-container-low)', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <p className="text-body mb-2" style={{ fontWeight: 600 }}>Expected Format Guide</p>
                <p className="text-label-sm mb-4" style={{ opacity: 0.8 }}>Your CSV must contain exactly 2 plain columns. Do not use quotes or special characters.</p>
                <pre style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', fontSize: '0.9rem' }}>
{`Name, Phone
John Doe, 15551234567
Alice Smith, 14449876543`}
                </pre>
                <p className="text-label-sm mt-4 text-orange-600" style={{ fontWeight: 700, color: '#e84545' }}>
                  CAUTION: Importing clients will instantly execute the Automated SMS Dispatch using your Review Template! Wait time is proportionate to file size.
                </p>
             </div>
             
             <div>
               <input 
                 type="file" 
                 accept=".csv"
                 onChange={handleFileUpload}
                 style={{ display: 'block', width: '100%', padding: '1rem', border: '1px dashed var(--primary)', borderRadius: '0.5rem', cursor: 'pointer' }}
                 disabled={isImporting}
               />
               {isImporting && <p className="text-label-sm mt-3" style={{ color: 'var(--primary)', fontWeight: 700 }}>Processing CSV & blasting automation hooks... Do not close window.</p>}
             </div>
          </div>
        </div>
      )}

      {/* PROFILE POPUP MODAL */}
      {activeClient && (
        <div onClick={() => setActiveClient(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div className="flex justify-between items-start">
               <div>
                 <h2 className="text-title-lg">{activeClient.name}</h2>
                 <p className="text-body" style={{ color: 'var(--on-surface-variant)' }}>{activeClient.phone}</p>
               </div>
               <span style={{ 
                      padding: '0.35rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700,
                      backgroundColor: activeClient.rating_status?.includes('5-Star') ? '#E8F5E9' : activeClient.rating_status?.includes('Star') ? '#FFF3CD' : 'var(--surface-container-high)',
                      color: activeClient.rating_status?.includes('5-Star') ? 'var(--primary)' : activeClient.rating_status?.includes('Star') ? '#856404' : 'var(--on-surface-variant)'
               }}>
                 {activeClient.rating_status || 'Pending'}
               </span>
             </div>
             
             <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }}>
                <p className="text-label-sm" style={{ fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>Acquisition Data</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div>
                     <p className="text-label-sm" style={{ opacity: 0.7 }}>Date Added</p>
                     <p className="text-body" style={{ fontWeight: 600 }}>{new Date(activeClient.created_at).toLocaleDateString()}</p>
                   </div>
                   <div>
                     <p className="text-label-sm" style={{ opacity: 0.7 }}>Tags</p>
                     <p className="text-body" style={{ fontWeight: 600 }}>{activeClient.tags && activeClient.tags.length > 0 ? activeClient.tags.join(', ') : 'None'}</p>
                   </div>
                </div>
             </div>

             <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setActiveClient(null)} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }}>Close Profile</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Clients;

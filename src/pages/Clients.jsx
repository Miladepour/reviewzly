import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../contexts/ToastContext';
import { normalizePhone } from '../utils/formatters';

const Clients = () => {
  const addToast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Notifications
  const [pageMessage, setPageMessage] = useState('');
  const [pageError, setPageError] = useState('');

  const displayNotice = (msg, isError = false) => {
    if (isError) setPageError(msg); else setPageMessage(msg);
    setTimeout(() => { setPageError(''); setPageMessage(''); }, 5000);
  };

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Profile Popup State
  const [activeClient, setActiveClient] = useState(null);
  
  // Advanced Profile State
  const [clientHistory, setClientHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('data'); // 'data' | 'history'
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDob, setEditDob] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
     if (activeClient) {
         setProfileTab('data');
         setIsEditMode(false);
         setEditName(activeClient.name || '');
         setEditPhone(activeClient.phone || '');
         setEditEmail(activeClient.email || '');
         setEditDob(activeClient.dob || '');

         const fetchHistory = async () => {
             setIsHistoryLoading(true);
             const { data } = await supabase.from('communications').select('*').eq('client_id', activeClient.id).order('created_at', { ascending: false });
             if (data) setClientHistory(data);
             setIsHistoryLoading(false);
         };
         fetchHistory();
     }
  }, [activeClient]);

  const handleSaveEdit = async (e) => {
      e.preventDefault();
      setIsSavingEdit(true);
      try {
          const cleanTargetPhone = normalizePhone(editPhone);
          const isDuplicate = clients.some(c => c.id !== activeClient.id && normalizePhone(c.phone) === cleanTargetPhone);
          
          if (isDuplicate) {
              displayNotice('Editing blocked: Another client already uses this mobile number.', true);
              addToast('Duplicate phone number detected.', 'error');
              setIsSavingEdit(false);
              return;
          }

          const { data, error } = await supabase.from('clients').update({
              name: editName, phone: cleanTargetPhone, email: editEmail, dob: editDob
          }).eq('id', activeClient.id).select();
          
          if (error) throw error;
          if (!data || data.length === 0) throw new Error("RLS Authorization Failed. Zero rows affected.");
          
          setClients(clients.map(c => c.id === activeClient.id ? { ...c, name: editName, phone: editPhone, email: editEmail, dob: editDob } : c));
          setActiveClient({ ...activeClient, name: editName, phone: editPhone, email: editEmail, dob: editDob });
          setIsEditMode(false);
      } catch (err) {
          displayNotice('Error saving client edits: Unauthorized', true);
          addToast("Failed to mutate CRM dataset. Blocked by security firewall.", "error");
      } finally { setIsSavingEdit(false); }
  };
  
  // Add Client State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addDob, setAddDob] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleDirectoryQuickAdd = async (e) => {
      e.preventDefault();
      setIsAdding(true);

      try {
          const cleanTargetPhone = normalizePhone(addPhone);
          const isDuplicate = clients.some(c => normalizePhone(c.phone) === cleanTargetPhone);
          
          if (isDuplicate) {
              displayNotice("A client with this exact mobile number already exists.", true);
              addToast("Blocked: Duplicate phone number.", "error");
              setIsAdding(false);
              return;
          }

          const { data: bData } = await supabase.from('businesses').select('*').eq('id', session.user.id).single();
          
          const delayHours = bData?.delay_hours_for_invite || 2;
          const nextActionDate = new Date();
          nextActionDate.setHours(nextActionDate.getHours() + delayHours);

          const { data: clientData, error } = await supabase.from('clients').insert([{
            business_id: session.user.id,
            name: addName,
            phone: cleanTargetPhone,
            email: addEmail || null,
            dob: addDob || null,
            tags: ['Directory Add'],
            drip_step: 1,
            next_action_time: nextActionDate.toISOString()
          }]).select().single();

          if (error) throw error;

          let dispatchLogText = `Client dynamically queued. Review scheduled globally for ${delayHours} hours from now.`;

          const welcomeTemplate = bData?.welcome_sms;
          if (welcomeTemplate && welcomeTemplate.trim() !== '') {
              let finalSms = welcomeTemplate
                  .replace(/{{business_name}}/g, bData.name || 'Our Business')
                  .replace(/{{client_name}}/g, addName || 'there');

              try {
                  const destPhone = addPhone.replace(/[^0-9]/g, '');
                  const vRes = await fetch('/api/send_sms', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dest: destPhone, msg: finalSms, clientName: addName })
                  });
                  if (vRes.ok) {
                      dispatchLogText = `[AUTO-DISPATCH SUCCESS] ` + finalSms;
                  } else if (vRes.status === 402) {
                      dispatchLogText = `[AUTO-DISPATCH BLOCKED] Insufficient SMS Credits.`;
                      displayNotice("Insufficient SMS Credits.", true);
                  } else {
                      dispatchLogText = `[AUTO-DISPATCH BLOCKED] ` + finalSms;
                  }
              } catch(err) {
                  dispatchLogText = `[AUTO-DISPATCH ERROR] Network proxy securely failed.`;
              }
          }

          await supabase.from('communications').insert([{
             client_id: clientData.id, business_id: session.user.id, type: 'BULK_CAMPAIGN', text: dispatchLogText, is_outbound: true
          }]);

          setAddName(''); setAddPhone(''); setAddEmail(''); setAddDob('');
          setIsAddModalOpen(false);

          const { data } = await supabase.from('clients').select('*').eq('business_id', session.user.id).order('created_at', { ascending: false });
          if(data) setClients(data);

      } catch (error) {
          displayNotice('Error saving client. Please try again.', true);
          addToast("Failed to write to central CRM block.", "error");
      } finally {
          setIsAdding(false);
      }
  };
  
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

        const delayHours = bData?.delay_hours_for_invite || 2;
        const baseNextActionDate = new Date();
        baseNextActionDate.setHours(baseNextActionDate.getHours() + delayHours);

        let importedCount = 0;
        let skippedCount = 0;
        
        // Track new numbers added within this batch to prevent duplicates inside the CSV itself
        const inMemoryBatchPhones = new Set(clients.map(c => normalizePhone(c.phone)));

        for (const row of rows) {
            const cols = row.split(',').map(c => c.trim());
            const cName = cols[0];
            const cPhone = cols[1];
            
            if (!cName || !cPhone) continue;

            const cleanCsvPhone = normalizePhone(cPhone);
            if (inMemoryBatchPhones.has(cleanCsvPhone)) {
                skippedCount++;
                continue;
            }
            inMemoryBatchPhones.add(cleanCsvPhone);

            const { data: clientData, error } = await supabase.from('clients').insert([{
              business_id: bid,
              name: cName,
              phone: cleanCsvPhone,
              tags: ['CSV Import'],
              drip_step: 1,
              next_action_time: baseNextActionDate.toISOString()
            }]).select().single();

            if (!error && clientData) {
                importedCount++;
                
                // Fire Automated SMS Template if exists
                let dispatchLogText = 'Added via mass queue without SMS.';
                
                const welcomeTemplate = bData?.welcome_sms;
                if (welcomeTemplate && welcomeTemplate.trim() !== '') {
                    let finalSms = welcomeTemplate
                        .replace(/{{business_name}}/g, bData.name || 'Our Business')
                        .replace(/{{client_name}}/g, cName || 'there');
                    
                    try {
                       const destPhone = cPhone.replace(/[^0-9]/g, '');
                       const vRes = await fetch('/api/send_sms', {
                          method: 'POST',
                          headers: { 
                              'Authorization': `Bearer ${session.access_token}`,
                              'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                              dest: destPhone,
                              msg: finalSms,
                              clientName: cName
                          })
                       });
                       
                       if (vRes.ok) {
                           dispatchLogText = `[AUTO-DISPATCH SUCCESS] ` + finalSms;
                       } else if (vRes.status === 402) {
                           dispatchLogText = `[AUTO-DISPATCH BLOCKED] Insufficient SMS Credits.`;
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
        
        displayNotice(`Successfully imported ${importedCount} unique clients. Skipped ${skippedCount} duplicates.`);
        setIsImportModalOpen(false);
        const { data } = await supabase.from('clients').select('*').eq('business_id', bid).order('created_at', { ascending: false });
        if(data) setClients(data);

    } catch (e) {
        displayNotice("Error parsing CSV format.", true);
        addToast("Error loading target client record.", "error");
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
        addToast("Failed to generate communication array.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleDeleteClient = async (e, clientId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to completely erase this contact and their history?")) {
        // Enforce RLS feedback loop by forcing Supabase to return the mathematically deleted rows
        const { data, error } = await supabase.from('clients').delete().eq('id', clientId).select();
        
        if (error) {
            displayNotice("Error deleting client.", true);
            addToast("Failed to permanently delete client record.", "error");
        } else if (!data || data.length === 0) {
            displayNotice("Security Block: You are not authorized to delete this.", true);
            addToast("RLS Violation: Unauthorized Action Blocked.", "error");
        } else {
            setClients(prev => prev.filter(c => c.id !== clientId));
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
        
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface)' }}>
            + Add Client
          </button>
          <button className="btn-primary" onClick={() => setIsImportModalOpen(true)} style={{ padding: '0.75rem 1.5rem' }}>
            + Import CSV
          </button>
        </div>
      </div>

      {pageMessage && <div style={{ padding: '1rem', backgroundColor: '#E8F5E9', color: '#2e7d32', borderRadius: '0.5rem', fontWeight: 600, border: '1px solid #c8e6c9' }}>{pageMessage}</div>}
      {pageError && <div style={{ padding: '1rem', backgroundColor: '#FFEBEE', color: '#c62828', borderRadius: '0.5rem', fontWeight: 600, border: '1px solid #ffcdd2' }}>{pageError}</div>}

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
                  CAUTION: Importing clients will instantly enqueue them for automated sequential Drip Campaigns! Do not upload previously engaged pipelines.
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

      {/* MANUAL ADD CLIENT MODAL */}
      {isAddModalOpen && (
        <div onClick={() => setIsAddModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <h2 className="text-title-lg">Add New Contact</h2>
             <form onSubmit={handleDirectoryQuickAdd} className="flex flex-col gap-4">
                <input type="text" placeholder="Full Name*" value={addName} onChange={(e) => setAddName(e.target.value)} required style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }} />
                <input type="tel" placeholder="Mobile Number*" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} required style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }} />
                <input type="email" placeholder="Email Address (Optional)" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }} />
                <input type="date" placeholder="Date of Birth (Optional)" value={addDob} onChange={(e) => setAddDob(e.target.value)} style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }} />
                
                <div className="flex gap-2 justify-end mt-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isAdding} style={{ padding: '0.75rem 1.5rem' }}>
                    {isAdding ? 'Routing...' : 'Inject & Automate SMS'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* PROFILE POPUP MODAL */}
      {activeClient && (
        <div onClick={() => setActiveClient(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
             
             {/* Header */}
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

             {/* Tab Navigation */}
             <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)' }}>
                <button onClick={() => setProfileTab('data')} style={{ flex: 1, padding: '1rem', background: profileTab === 'data' ? 'white' : 'transparent', border: 'none', borderBottom: profileTab === 'data' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: 700, cursor: 'pointer', color: profileTab === 'data' ? 'var(--primary)' : 'var(--on-surface-variant)' }}>User Profile</button>
                <button onClick={() => setProfileTab('history')} style={{ flex: 1, padding: '1rem', background: profileTab === 'history' ? 'white' : 'transparent', border: 'none', borderBottom: profileTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: 700, cursor: 'pointer', color: profileTab === 'history' ? 'var(--primary)' : 'var(--on-surface-variant)' }}>Conversations</button>
             </div>
             
             <div style={{ minHeight: '300px' }}>
                 {/* DATA TAB */}
                 {profileTab === 'data' && (
                     <>
                      {!isEditMode ? (
                        <div className="flex flex-col gap-4">
                            <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }}>
                                <p className="text-label-sm" style={{ fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>Personal Identity</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                    <p className="text-body"><strong>Email:</strong> {activeClient.email || 'None provided'}</p>
                                    <p className="text-body"><strong>Date of Birth:</strong> {activeClient.dob || 'None provided'}</p>
                                </div>
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
                        </div>
                      ) : (
                          <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                              <input type="text" placeholder="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} required style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }} />
                              <input type="tel" placeholder="Phone Number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }} />
                              <input type="email" placeholder="Email Address" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }} />
                              <input type="date" placeholder="Date of Birth" value={editDob} onChange={(e) => setEditDob(e.target.value)} style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }} />
                              <button type="submit" disabled={isSavingEdit} className="btn-primary" style={{ marginTop: '0.5rem' }}>{isSavingEdit ? 'Saving...' : 'Confirm Edits'}</button>
                          </form>
                      )}
                     </>
                 )}

                 {/* HISTORY TAB */}
                 {profileTab === 'history' && (
                     <div className="flex flex-col gap-3">
                         {isHistoryLoading ? <p className="text-body">Fetching logs from Postgres...</p> : clientHistory.length === 0 ? <p className="text-body text-center" style={{ padding: '2rem' }}>No communication history found.</p> : clientHistory.map(comm => (
                             <div key={comm.id} style={{ display: 'flex', flexDirection: 'column', alignItems: comm.is_outbound ? 'flex-end' : 'flex-start' }}>
                                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>{new Date(comm.created_at).toLocaleString()}</p>
                                <div style={{ 
                                    padding: '0.75rem 1rem', borderRadius: '1rem', maxWidth: '85%',
                                    backgroundColor: comm.is_outbound ? 'var(--primary)' : 'var(--surface-container-high)',
                                    color: comm.is_outbound ? 'white' : 'var(--on-surface)'
                                }}>
                                    <p className="text-body" style={{ fontSize: '0.9rem' }}>{comm.text}</p>
                                </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>

             <div className="flex gap-2 justify-end mt-2 pt-4" style={{ borderTop: '1px solid var(--outline-variant)' }}>
                {profileTab === 'data' && (
                     <button onClick={() => setIsEditMode(!isEditMode)} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                        {isEditMode ? 'Cancel Edit' : 'Edit Profile'}
                     </button>
                )}
                <button onClick={() => setActiveClient(null)} className="btn-primary" style={{ backgroundColor: 'var(--surface-container-highest)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }}>Close Window</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Clients;
